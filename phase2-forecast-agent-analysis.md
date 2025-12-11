# Phase 2: Forecast Agent Code Analysis

**Analysis Date**: 2025-12-10
**Purpose**: Systematic code-first documentation of Forecast Agent ml_lib framework

---

## Overview

**Total Python files**: 29

**ml_lib framework structure**:
- `models/` - 3 files (baseline.py, linear.py, multi_horizon.py)
- `transformers/` - 3 files (imputation.py, sentiment_features.py, weather_features.py)
- `cross_validation/` - 2 files (data_loader.py, time_series_cv.py)

---

## Models

### 1. baseline.py
**File**: `forecast_agent/ml_lib/models/baseline.py` (127 lines)

**What it implements**:
- **NaiveForecaster** (PySpark Transformer class, lines 15-77):
  - Forecast = last observed value for all 14 days
  - Stateless transformer for time-series CV
  - Input: date, close
  - Output: forecast_day_1, forecast_day_2, ..., forecast_day_14

- **naive_forecast_pandas()** function (lines 79-103):
  - Pandas version of naive forecasting for local execution
  - Returns DataFrame with forecast columns

- **random_walk_forecast_pandas()** function (lines 106-126):
  - Random walk without drift (equivalent to naive)
  - Returns same as naive_forecast_pandas()

**Code evidence**:
```python
# Lines 15-16
class NaiveForecaster(Transformer):
    """
    Naive forecasting: forecast = last observed value.
```

---

### 2. linear.py
**File**: `forecast_agent/ml_lib/models/linear.py` (78 lines)

**What it implements**:
- **build_linear_regression_pipeline()** function (lines 16-77):
  - Creates PySpark ML Pipeline with VectorAssembler + LinearRegression
  - Supports 4 variants via parameters:
    1. Simple Linear Regression (reg_param=0.0)
    2. Ridge Regression (reg_param>0, elastic_net_param=0.0)
    3. LASSO (reg_param>0, elastic_net_param=1.0)
    4. ElasticNet (reg_param>0, 0<elastic_net_param<1)

**Parameters**:
- `feature_cols`: List of feature column names
- `target_col`: Target variable (default: "close")
- `reg_param`: Regularization parameter (default: 0.0 for no regularization)
- `elastic_net_param`: ElasticNet mixing (0=Ridge, 1=LASSO)
- `maxIter`: 100
- `tol`: 1e-6

**Code evidence**:
```python
# Lines 16-17
def build_linear_regression_pipeline(
    feature_cols: List[str],
    target_col: str = "close",
    reg_param: float = 0.0,
    elastic_net_param: float = 0.0
) -> Pipeline:

# Lines 64-72
lr = LinearRegression(
    featuresCol="features",
    labelCol=target_col,
    predictionCol="prediction",
    regParam=reg_param,
    elasticNetParam=elastic_net_param,
    maxIter=100,
    tol=1e-6
)
```

---

### 3. multi_horizon.py
**File**: `forecast_agent/ml_lib/models/multi_horizon.py` (11 lines)

**What it implements**:
- **NOTHING** - documentation-only file

**Contents**:
- Comments describing 3 multi-horizon strategies:
  1. Direct strategy: Train 14 separate models (one per horizon)
  2. Recursive strategy: Use day_i forecast as input for day_i+1
  3. Multi-output wrapper: Single model with 14 outputs

**Note**: File states "For now, we use the **Direct strategy**" but no implementation provided

**Code evidence**:
```python
# Lines 1-11
"""
Multi-horizon forecasting models.

Provides strategies for generating 14-day forecasts from single-output models:
1. Direct strategy: Train 14 separate models (one per horizon)
2. Recursive strategy: Use day_i forecast as input for day_i+1
3. Multi-output wrapper: Single model with 14 outputs

For now, we use the **Direct strategy** which is most robust for
independent predictions and works well with cross-validation.
"""
```

---

## Transformers

### 1. imputation.py
**File**: `forecast_agent/ml_lib/transformers/imputation.py` (verified earlier in conversation)

**What it implements**:
- **4 imputation strategies**:
  1. `forward_fill` - For OHLV and VIX
  2. `mean_7d` - For FX rates
  3. `zero` - For GDELT pre-2021
  4. `keep_null` - For XGBoost-native NULL handling

**See Phase 1 analysis for detailed code evidence**

---

### 2. sentiment_features.py
**File**: `forecast_agent/ml_lib/transformers/sentiment_features.py` (154 lines)

**What it implements**:

#### GdeltAggregator (PySpark Transformer, lines 14-99)
- Transforms GDELT array into aggregate scalar features
- **Weighted average** by article_count across all theme groups

**Input**:
```
gdelt_themes: ARRAY<STRUCT<
    theme_group: STRING,
    article_count: BIGINT,
    tone_avg: DOUBLE,
    tone_positive: DOUBLE,
    tone_negative: DOUBLE,
    tone_polarity: DOUBLE
>>
```

**Output columns added**:
- `gdelt_tone_avg`: DOUBLE (weighted by article_count)
- `gdelt_tone_positive`: DOUBLE
- `gdelt_tone_negative`: DOUBLE
- `gdelt_tone_polarity`: DOUBLE
- `gdelt_total_articles`: BIGINT

**Formula**: `sum(tone * article_count) / sum(article_count)`

**Code evidence**:
```python
# Lines 63-69
df = df.withColumn(
    "gdelt_tone_avg",
    expr(f"""
        aggregate({input_col}, 0D, (acc, x) -> acc + (x.tone_avg * x.article_count))
        / NULLIF(gdelt_total_articles, 0)
    """)
)
```

---

#### GdeltThemeExpander (PySpark Transformer, lines 101-153)
- Expands GDELT array into separate columns for each theme group
- Creates **4 columns per theme group** × 7 groups = **28 columns**

**Theme groups**: SUPPLY, LOGISTICS, TRADE, MARKET, POLICY, CORE, OTHER

**Output columns** (per theme):
- `gdelt_{theme}_count`: Article count for this theme
- `gdelt_{theme}_tone_avg`: Average tone
- `gdelt_{theme}_tone_positive`: Positive tone score
- `gdelt_{theme}_tone_polarity`: Tone polarity

**Code evidence**:
```python
# Lines 125-126
themes = ['SUPPLY', 'LOGISTICS', 'TRADE', 'MARKET', 'POLICY', 'CORE', 'OTHER']

# Lines 133-148: Creates 4 columns per theme
df = df.withColumn(
    f"gdelt_{theme_lower}_count",
    expr(f"element_at(filter({input_col}, x -> x.theme_group = '{theme}'), 1).article_count")
)
# ... (3 more columns for tone metrics)
```

---

### 3. weather_features.py
**File**: `forecast_agent/ml_lib/transformers/weather_features.py` (270 lines)

**What it implements**:

#### WeatherAggregator (PySpark Transformer, lines 21-127)
- Aggregates weather_data array using min/max/mean strategies across all regions

**Input**:
```
weather_data: ARRAY<STRUCT<
    region: STRING,
    temp_max_c: DOUBLE,
    temp_min_c: DOUBLE,
    temp_mean_c: DOUBLE,
    precipitation_mm: DOUBLE,
    rain_mm: DOUBLE,
    snowfall_cm: DOUBLE,
    humidity_mean_pct: DOUBLE,
    wind_speed_max_kmh: DOUBLE
>>
```

**8 weather fields aggregated**:
- temp_mean_c, temp_max_c, temp_min_c
- precipitation_mm, rain_mm, snowfall_cm
- humidity_mean_pct, wind_speed_max_kmh

**Aggregation strategies**:
- `'mean'`: Average across all regions (8 columns)
  - e.g., `weather_temp_mean_c_avg`
- `'min_max'`: Min and max across regions (16 columns) **[RECOMMENDED for production]**
  - e.g., `weather_temp_mean_c_min`, `weather_temp_mean_c_max`
  - Captures extreme weather events (frost, drought, excessive heat)
- `'all'`: Both mean and min_max (24 columns)

**Key insight**: Extreme weather events harm production more than average conditions, so min/max aggregations are more predictive

**Code evidence**:
```python
# Lines 81-85
fields = [
    'temp_mean_c', 'temp_max_c', 'temp_min_c',
    'precipitation_mm', 'rain_mm', 'snowfall_cm',
    'humidity_mean_pct', 'wind_speed_max_kmh'
]

# Lines 95-115: Min/Max aggregation logic
df = df.withColumn(
    f"weather_{field}_min",
    expr(f"""
        aggregate({input_col},
                  CAST(1e308 AS DOUBLE),  -- Initialize with max double value
                  (acc, x) -> CASE WHEN x.{field} < acc THEN x.{field} ELSE acc END)
    """)
)
```

---

#### WeatherRegionExpander (PySpark Transformer, lines 129-193)
- Expands weather_data into separate columns for **each region**
- Creates **~520 columns** (65 regions × 8 fields)

**Use case**:
- Full regional granularity
- Tree-based models (can handle many features)
- Enough data for region-specific patterns

**Warning**: Very high dimensionality

**Code evidence**:
```python
# Lines 169-174
fields = [
    'temp_mean_c', 'temp_max_c', 'temp_min_c',
    'precipitation_mm', 'rain_mm', 'snowfall_cm',
    'humidity_mean_pct', 'wind_speed_max_kmh'
]
```

---

#### WeatherRegionSelector (PySpark Transformer, lines 196-269)
- Expands weather_data for **selected high-importance regions only**
- Default: Top 6 coffee producing regions

**Default regions** (lines 228-236):
- Minas_Gerais_Brazil
- Sao_Paulo_Brazil
- Antioquia_Colombia
- Huila_Colombia
- Sidamo_Ethiopia
- Central_Highlands_Vietnam

**Use case**: After feature selection to reduce dimensionality

**Code evidence**:
```python
# Lines 228-236
regions = [
    'Minas_Gerais_Brazil',
    'Sao_Paulo_Brazil',
    'Antioquia_Colombia',
    'Huila_Colombia',
    'Sidamo_Ethiopia',
    'Central_Highlands_Vietnam'
]
```

---

## Cross-Validation

### 1. data_loader.py
**File**: `forecast_agent/ml_lib/cross_validation/data_loader.py` (196 lines)

**What it implements**:

#### GoldDataLoader (class, lines 12-195)
- Loads data from `commodity.gold.unified_data` for time-series forecasting

**Methods**:

**load()** (lines 40-87):
- Filters by commodity ('Coffee' or 'Sugar')
- Filters by date range (optional start_date, end_date)
- Option to include/exclude non-trading days
- Returns ordered PySpark DataFrame

**Columns returned**:
- date (DATE)
- commodity (STRING)
- close (DOUBLE) - target variable
- open, high, low, volume (DOUBLE)
- vix (DOUBLE)
- is_trading_day (INT)
- weather_data (ARRAY<STRUCT>)
- gdelt_themes (ARRAY<STRUCT>)
- 24 exchange rate columns (vnd_usd, cop_usd, ...)

**load_for_training()** (lines 89-127):
- Loads training data up to a cutoff date (for backtesting)
- Optional lookback_days parameter
- Excludes cutoff date itself (predicting from it)

**get_date_range()** (lines 129-146):
- Returns (min_date, max_date) for a commodity

**validate_data()** (lines 148-195):
- Validates data quality
- Checks for NULLs in critical columns
- Validates array sizes (weather_data, gdelt_themes)

**Code evidence**:
```python
# Lines 30-37
def __init__(self, table_name: str = "commodity.gold.unified_data"):
    """
    Initialize data loader.

    Args:
        table_name: Full table name (catalog.schema.table)
    """
    self.table_name = table_name
```

---

### 2. time_series_cv.py
**File**: `forecast_agent/ml_lib/cross_validation/time_series_cv.py` (300 lines)

**What it implements**:

#### TimeSeriesForecastCV (class, lines 18-299)
- Walk-forward time-series cross-validation for forecasting models

**Window strategies** (lines 23-24):
- **Expanding**: Training window grows over time (2018-2020, 2018-2021, ...)
- **Rolling**: Training window slides with fixed size (2018-2020, 2019-2021, ...)

**Primary metrics** (lines 26-28):
- **Directional Accuracy from Day 0**: Is forecast_day_i > close_day_0? (primary metric)
- MAE, RMSE (secondary)

**Residual collection** (lines 30-31):
- Stores forecast errors for block bootstrap Monte Carlo simulation

**Key methods**:

**__init__()** (lines 58-91):
- Parameters:
  - `pipeline`: PySpark ML Pipeline to evaluate
  - `commodity`: 'Coffee' or 'Sugar'
  - `n_folds`: Number of CV folds (default: 5)
  - `window_type`: 'expanding' or 'rolling' (default: 'expanding')
  - `horizon`: Forecast horizon in days (default: 14)
  - `validation_months`: Validation period size (default: 6 months)
  - `min_train_months`: Minimum training data (default: 24 months)
  - `table_name`: Gold table name (default: "commodity.gold.unified_data")

**_create_folds()** (lines 98-147):
- Creates time-series CV folds
- Returns List of (train_df, validation_df) tuples

**_evaluate_fold()** (lines 149-211):
- Calculates directional accuracy from day 0
- Computes MAE, RMSE
- Stores residuals for Monte Carlo

**fit()** (lines 213-268):
- Runs time-series cross-validation
- Returns dict with:
  - `cv_metrics`: List of metrics per fold
  - `mean_directional_accuracy`: Average across folds
  - `mean_mae`, `mean_rmse`: Average error metrics
  - `fold_models`: List of fitted PipelineModels

**get_residuals()** (lines 270-280):
- Returns residuals from all CV folds for Monte Carlo simulation
- Returns DataFrame with columns: residual_day_1...residual_day_14, fold

**get_final_model()** (lines 282-299):
- Trains final model on all available data
- Returns fitted PipelineModel

**Code evidence**:
```python
# Lines 178-186: Directional accuracy calculation
for day in range(1, self.horizon + 1):
    # Actual direction: is day_i > day_0?
    actual_dir = merged[f'close_day_{i}_actual'] > merged['close_day_0_actual']
    forecast_dir = merged[f'forecast_day_{day}'] > merged['close_day_0_actual']

    # Accuracy: did we get the direction right?
    correct = (actual_dir == forecast_dir).mean()
    dir_accuracies.append(correct)

# Lines 199-204: Residual collection
residuals_df = pd.DataFrame({
    f'residual_day_{i}': merged[f'close_day_{i}_actual'] - merged[f'forecast_day_{i}']
    for i in range(1, self.horizon + 1)
})
```

---

## Summary

**Models**: 2 actual implementations
- NaiveForecaster (PySpark Transformer)
- build_linear_regression_pipeline() (supports 4 variants: Simple, Ridge, LASSO, ElasticNet)

**Note**: multi_horizon.py is documentation-only, no implementation

**Transformers**: 6 total (3 files)
- ImputationTransformer (4 strategies)
- GdeltAggregator (weighted average aggregation)
- GdeltThemeExpander (28 columns for 7 theme groups)
- WeatherAggregator (min/max/mean aggregation, recommended: min_max)
- WeatherRegionExpander (~520 columns for all regions)
- WeatherRegionSelector (selected high-importance regions)

**Cross-validation**: 2 classes
- GoldDataLoader (loads from commodity.gold.unified_data)
- TimeSeriesForecastCV (walk-forward CV with expanding/rolling windows, directional accuracy metric, residual collection for Monte Carlo)

**Data source**: `commodity.gold.unified_data` (gold layer table)

**Forecasting horizon**: 14 days

**Primary metric**: Directional accuracy from day 0 (Is forecast_day_i > close_day_0?)

---

**Analysis complete**. Moving to Phase 3: Trading Agent Code Analysis.
