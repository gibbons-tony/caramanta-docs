---
sidebar_position: 1
---

# Forecast Agent

Machine learning framework for commodity price forecasting built on PySpark.

## ml_lib Framework

PySpark-based forecasting pipeline located in `forecast_agent/ml_lib/`.

---

## Models

### Naive Forecaster
**Source**: `ml_lib/models/baseline.py` (127 lines)

**Implementations**:
- **NaiveForecaster** (PySpark Transformer, lines 15-77)
  - Forecast = last observed value for all 14 days
  - Stateless transformer for time-series CV
  - Input: date, close
  - Output: forecast_day_1, forecast_day_2, ..., forecast_day_14

- **naive_forecast_pandas()** (lines 79-103)
  - Pandas version for local execution

- **random_walk_forecast_pandas()** (lines 106-126)
  - Random walk without drift (equivalent to naive)

### Linear Regression
**Source**: `ml_lib/models/linear.py` (78 lines)

**build_linear_regression_pipeline()** (lines 16-77):
- Creates PySpark ML Pipeline with VectorAssembler + LinearRegression
- **4 variants supported**:
  1. Simple Linear Regression (reg_param=0.0)
  2. Ridge Regression (reg_param>0, elastic_net_param=0.0)
  3. LASSO (reg_param>0, elastic_net_param=1.0)
  4. ElasticNet (reg_param &gt; 0, 0 &lt; elastic_net_param &lt; 1)

**Parameters**:
- `feature_cols`: List of feature column names
- `target_col`: Target variable (default: "close")
- `reg_param`: Regularization parameter (default: 0.0)
- `elastic_net_param`: ElasticNet mixing (0=Ridge, 1=LASSO)
- `maxIter`: 100, `tol`: 1e-6

### Multi-Horizon (Documentation Only)
**Source**: `ml_lib/models/multi_horizon.py` (11 lines)

**Contents**: Comments describing 3 strategies (Direct, Recursive, Multi-output)

**Note**: No implementation, documentation-only file

---

## Transformers

### ImputationTransformer
**Source**: `ml_lib/transformers/imputation.py`

**4 strategies**:
1. `forward_fill` - For OHLV and VIX
2. `mean_7d` - For FX rates (7-day rolling average)
3. `zero` - For GDELT pre-2021 (missing data → 0)
4. `keep_null` - For XGBoost-native NULL handling

**Source**: Lines 58-76 document strategies, implementation in `imputation.py`

### GDELT Sentiment Features
**Source**: `ml_lib/transformers/sentiment_features.py` (154 lines)

#### GdeltAggregator (lines 14-99)
- Transforms GDELT array → aggregate scalar features
- **Weighted average** by article_count across all theme groups

**Input**:
```sql
gdelt_themes: ARRAY<STRUCT<
    theme_group: STRING,
    article_count: BIGINT,
    tone_avg, tone_positive, tone_negative, tone_polarity: DOUBLE
>>
```

**Output columns**:
- `gdelt_tone_avg`: DOUBLE (weighted by article_count)
- `gdelt_tone_positive`, `gdelt_tone_negative`, `gdelt_tone_polarity`: DOUBLE
- `gdelt_total_articles`: BIGINT

**Formula**: `sum(tone * article_count) / sum(article_count)`

#### GdeltThemeExpander (lines 101-153)
- Expands GDELT array → separate columns per theme group
- **28 columns** (7 theme groups × 4 metrics)

**Theme groups**: SUPPLY, LOGISTICS, TRADE, MARKET, POLICY, CORE, OTHER

**Output per theme**:
- `gdelt_{theme}_count`: Article count
- `gdelt_{theme}_tone_avg`: Average tone
- `gdelt_{theme}_tone_positive`: Positive score
- `gdelt_{theme}_tone_polarity`: Polarity

### Weather Features
**Source**: `ml_lib/transformers/weather_features.py` (270 lines)

#### WeatherAggregator (lines 21-127)
- Aggregates weather_data array using min/max/mean strategies

**8 weather fields**:
- temp_mean_c, temp_max_c, temp_min_c
- precipitation_mm, rain_mm, snowfall_cm
- humidity_mean_pct, wind_speed_max_kmh

**Aggregation strategies**:
- `'mean'`: Average across all regions (8 columns)
- `'min_max'`: Min and max across regions (16 columns) **[RECOMMENDED]**
  - Captures extreme weather events (frost, drought, excessive heat)
- `'all'`: Both mean and min_max (24 columns)

**Key insight**: Extreme weather events harm production more than average conditions, so min/max aggregations are more predictive than mean

#### WeatherRegionExpander (lines 129-193)
- Expands weather_data for **all regions**
- Creates **~520 columns** (65 regions × 8 fields)
- Use case: Full regional granularity, tree-based models

#### WeatherRegionSelector (lines 196-269)
- Expands weather_data for **selected high-importance regions only**
- Default regions (lines 228-236): Minas_Gerais_Brazil, Sao_Paulo_Brazil, Antioquia_Colombia, Huila_Colombia, Sidamo_Ethiopia, Central_Highlands_Vietnam
- Use case: After feature selection to reduce dimensionality

---

## Cross-Validation

### GoldDataLoader
**Source**: `ml_lib/cross_validation/data_loader.py` (196 lines)

**What it does**: Loads data from `commodity.gold.unified_data` for time-series forecasting

**Key methods**:
- **load()** (lines 40-87): Filter by commodity, date range, trading days
- **load_for_training()** (lines 89-127): Load up to cutoff date for backtesting
- **get_date_range()** (lines 129-146): Returns (min_date, max_date)
- **validate_data()** (lines 148-195): Check NULLs, array sizes

**Columns returned**:
- date, commodity, close (target variable)
- open, high, low, volume, vix
- is_trading_day
- weather_data (array of structs)
- gdelt_themes (array of structs)
- 24 exchange rate columns

### TimeSeriesForecastCV
**Source**: `ml_lib/cross_validation/time_series_cv.py` (300 lines)

**What it does**: Walk-forward time-series cross-validation

**Window strategies**:
- **Expanding**: Training window grows (2018-2020, 2018-2021, ...)
- **Rolling**: Training window slides with fixed size (2018-2020, 2019-2021, ...)

**Primary metrics**:
- **Directional Accuracy from Day 0**: Is forecast_day_i > close_day_0? (primary)
- MAE, RMSE (secondary)

**Residual collection**: Stores forecast errors for block bootstrap Monte Carlo

**Key methods**:
- **__init__()** (lines 58-91): Configure CV parameters
- **_create_folds()** (lines 98-147): Generate train/validation splits
- **_evaluate_fold()** (lines 149-211): Calculate directional accuracy, MAE, RMSE
- **fit()** (lines 213-268): Run CV, return metrics
- **get_residuals()** (lines 270-280): Return residuals for Monte Carlo
- **get_final_model()** (lines 282-299): Train on all data

**Parameters**:
- `n_folds`: Number of CV folds (default: 5)
- `horizon`: Forecast horizon in days (default: 14)
- `validation_months`: Validation period size (default: 6)
- `min_train_months`: Minimum training data (default: 24)

---

## Summary

**Models**: 2 implementations
- NaiveForecaster (PySpark Transformer)
- build_linear_regression_pipeline() (4 variants: Simple, Ridge, LASSO, ElasticNet)

**Transformers**: 6 total
- ImputationTransformer (4 strategies)
- GdeltAggregator + GdeltThemeExpander (weighted average + 28 columns)
- WeatherAggregator + WeatherRegionExpander + WeatherRegionSelector (min/max/mean + ~520 columns + selected regions)

**Cross-validation**: 2 classes
- GoldDataLoader (loads from commodity.gold.unified_data)
- TimeSeriesForecastCV (walk-forward CV, directional accuracy metric, residual collection)

**Forecasting horizon**: 14 days

**Primary metric**: Directional accuracy from day 0

---

## Code Repository

📂 [View Code on GitHub](https://github.com/gibbonstony/ucberkeley-capstone/tree/main/forecast_agent)
