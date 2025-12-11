---
sidebar_position: 1
---

# Forecast Agent

The Forecast Agent is Ground Truth's machine learning forecasting engine, generating probabilistic 14-day price predictions for coffee and sugar futures through an evolved PySpark framework.

## Mission

Generate accurate, production-ready commodity price forecasts with 2,000 Monte Carlo paths per prediction, evolving from 24-48 hour backfills to minutes through architectural innovation.

## The Evolution: 180x Speedup

Three architectural iterations drove dramatic performance improvements:

### V1: Retrain-Per-Forecast (Baseline - Never Implemented)
- **Approach**: Train model fresh for every forecast date
- **Model trainings**: 2,875 for 2018-2024 backfill
- **Data loading**: 79,560 rows per forecast (entire history)
- **Total time**: 24-48 hours
- **Problem**: Redundant computation, massive data loading

### V2: Train-Once/Inference-Many (Nov-Dec 2024)
- **Innovation**: Periodic training with model persistence
- **Model trainings**: 16 semiannual windows (180x reduction)
- **Data loading**: 90 rows per forecast (880x reduction)
- **Total time**: 1-2 hours (24x faster)
- **Storage**: JSON (<1MB) or S3 (≥1MB)
- **Status**: Production → Deprecated Dec 2024

### V3: ml_lib + Gold Tables (Current - Dec 2024)
- **Innovation**: "Fit many, publish few" + 90% data reduction
- **Data**: 7,612 gold rows vs 75,000 silver (10x faster loading)
- **Testing**: forecast_testing schema for safe experimentation
- **Selection**: SQL-based selection of top ~15 from 200+ configs
- **Compute savings**: 93% (4,800 → 360 hours)
- **Status**: Current production architecture

**Result**: From days to minutes through iterative architectural improvements.

## "Fit Many, Publish Few" Strategy

**Problem**: If we fit 200+ model configurations and publish all, the Trading Agent would need to test 200 forecasts → combinatorial explosion.

**Solution**: Three-phase workflow

### Phase 1: Experiment (commodity.forecast_testing)
- Test 200+ model configurations
- Vary hyperparameters: SARIMAX orders, Prophet seasonality, XGBoost depth
- Vary features: price-only, +weather, +GDELT, +both
- Safe isolated schema (won't pollute production)

### Phase 2: Evaluate (SQL-based selection)
- **Primary metrics**: DA > 0.60, MAE < $5.00
- **Diversity requirements**:
  - Mix of model types (SARIMAX, Prophet, XGBoost, Random Walk)
  - Mix of feature sets (price-only vs weather-enhanced)
  - Mix of horizons (day 1-3 vs day 7 vs day 14 optimized)
- **Output**: Top ~15 diverse models

### Phase 3: Backfill & Publish (commodity.forecast)
- Backfill only selected 15 models (not all 200)
- **Compute savings**: 200 models × 24 hours = 4,800 hours → 15 models × 24 hours = 360 hours (93% reduction)
- Trading Agent receives curated set of 15 (manageable for multi-model backtesting)

## ml_lib Framework

Modern PySpark ML pipeline with Estimator/Transformer patterns:

### Core Components

**GoldDataLoader**
- Load `commodity.gold.unified_data` (production) or `commodity.gold.unified_data_raw` (experimental)
- Filter by commodity, date range
- Returns PySpark DataFrame

**ImputationTransformer**
- 4 strategies: `forward_fill`, `mean_7d`, `zero`, `keep_null`
- Per-feature configuration via wildcard patterns (`*_usd`, `gdelt_*`)
- Date-conditional strategies (GDELT pre/post 2021)
- **Critical**: `rowsBetween(unboundedPreceding, 0)` prevents data leakage

**TimeSeriesForecastCV**
- Cross-validation framework for time series
- Walk-forward validation
- 5-fold splits with non-overlapping test periods

**Model Implementations**
- SARIMAX - Auto-tuned with exogenous variables (weather, FX)
- Prophet - Additive/multiplicative seasonality, holiday effects
- XGBoost - Tree-based with feature engineering
- ARIMA - Classical time series
- Random Walk - Baseline benchmark

### Performance Optimizations

**Caching**: After imputation, cache DataFrame for 2-3x speedup across CV folds
```python
df_imputed = imputer.transform(df_raw)
df_imputed.cache()  # Avoids recomputing window functions
df_imputed.count()  # Materialize
```

**Array Operations**: Use `aggregate()` SQL function instead of exploding arrays (faster)
```python
# Aggregate weather across 67 regions
expr("aggregate(weather_data, 0.0, (acc, w) -> acc + w.temp_mean_c) / size(weather_data)")
```

## Model Suite

### Production Models

**Coffee** (10 real models):
- sarimax_auto_weather_v1 (MAE: $3.10, DA: 69.5%)
- prophet_v1
- xgboost_weather_v1
- arima_auto_v1
- random_walk_v1
- ... (5 more configurations)

**Sugar** (5 real models):
- sarimax_auto_weather_v1
- prophet_v1
- xgboost_weather_v1
- arima_auto_v1
- random_walk_v1

### Model Families

| Family | Models | Strengths | Exogenous Variables |
|:-------|:-------|:----------|:-------------------|
| **Statistical** | ARIMA, SARIMAX | Seasonal patterns, autocorrelation | Weather, FX, VIX |
| **Prophet** | Prophet | Holiday effects, trend changes | N/A (built-in) |
| **Tree-Based** | XGBoost | Non-linear relationships | Weather, GDELT, FX |
| **Baseline** | Random Walk | Benchmark comparison | N/A |

## Data Sources

### Production Table: `commodity.gold.unified_data`
- **All features forward-filled** (no NULLs)
- **7,612 rows** (Coffee + Sugar, 2015-2024)
- **Use for**: Stable, proven models
- **Example**: SARIMAX production model

### Experimental Table: `commodity.gold.unified_data_raw`
- **Only `close` forward-filled** (features preserve NULLs)
- **NULL rates**: ~30% market data (weekends), ~73% GDELT (no news)
- **Requires**: ImputationTransformer
- **Use for**: Testing imputation strategies, XGBoost (handles NULLs natively)

## Testing Schema Isolation

**commodity.forecast_testing.*** mirrors production but isolated:
- `distributions` - 2,000 MC paths
- `point_forecasts` - Mean, median, quantiles
- `model_metadata` - Performance metrics
- `validation_results` - Cross-validation outcomes
- `selected_for_publication` - SQL selection results

**Workflow**:
1. Fit 200+ configs in testing schema
2. Query `model_metadata` for metrics
3. Run SQL selection (top ~15 diverse models)
4. Validate selected models
5. Backfill selected models only
6. Promote to production (`commodity.forecast.*`)

## Forecast Output

### commodity.forecast.distributions
2,000 Monte Carlo simulation paths per forecast
- **Columns**: forecast_date, commodity, region, model_name, path_id, day_1...day_14, actual_close
- **Use**: Trading Agent risk analysis, uncertainty quantification

### commodity.forecast.point_forecasts
14-day forecasts with prediction intervals
- **Columns**: forecast_date, commodity, region, model_name, day_1...day_14, actual_close
- **Computed**: Mean, median, 10th/90th percentiles from distributions

### commodity.forecast.model_metadata
Model performance tracking
- **Columns**: model_name, commodity, MAE, RMSE, Dir Day0 (directional accuracy)
- **Use**: Model selection, performance monitoring

## Key Metrics

**MAE** (Mean Absolute Error): Average prediction error in dollars (e.g., $3.10 for SARIMAX+Weather)

**RMSE** (Root Mean Squared Error): Penalizes large errors more than MAE

**Dir Day0** (Critical for Trading): Directional accuracy from day 0 → Measures if day i > day 0 (trading signal quality, not just day-to-day changes)

**Production Benchmark**: SARIMAX+Weather achieves MAE $3.10, Dir Day0 69.5%

## Key Innovations

### 1. Train-Once/Inference-Many Pattern

**Before**: Retrain model for every forecast date → 2,875 trainings
**After**: Train semiannually, reuse models → 16 trainings (180x reduction)
**Impact**: 24-48 hours → 1-2 hours

### 2. Gold Table Integration

**Before**: 75,000 silver rows with manual regional aggregation
**After**: 7,612 gold rows with array-based weather/GDELT
**Impact**: 10x faster data loading, cleaner code

### 3. Testing Schema Isolation

**Before**: Testing new models risked polluting production
**After**: commodity.forecast_testing schema for safe experiments
**Impact**: Freedom to test 200+ configs without production impact

### 4. "Fit Many, Publish Few"

**Before**: Fit 10 models, publish all 10 → Trading Agent tests 10
**After**: Fit 200 models, select top 15, publish 15 → Trading Agent tests curated 15
**Impact**: 93% compute savings, manageable for Trading Agent

## Model Persistence Strategy

**Small models (<1MB)**: JSON in database
- Naive, Random Walk, ARIMA
- Fast save/load, no external dependencies

**Large models (≥1MB)**: S3 storage
- XGBoost, SARIMAX with many parameters
- Efficient for large serialized objects
- Requires AWS credentials

**Training frequency**: Semiannual (optimal cost/performance balance)

## Documentation

For detailed implementation:
- **Architecture**: [ARCHITECTURE.md](https://github.com/gibbonstony/ucberkeley-capstone/blob/main/forecast_agent/docs/ARCHITECTURE.md)
- **Evolution Story**: [FORECASTING_EVOLUTION.md](https://github.com/gibbonstony/ucberkeley-capstone/blob/main/forecast_agent/docs/FORECASTING_EVOLUTION.md)
- **ml_lib Quickstart**: [QUICKSTART.md](https://github.com/gibbonstony/ucberkeley-capstone/blob/main/forecast_agent/ml_lib/QUICKSTART.md)

## Code Repository

📂 **[View Forecast Agent Code on GitHub](https://github.com/gibbonstony/ucberkeley-capstone/tree/main/forecast_agent)**

## Impact

The Forecast Agent's architectural evolution enabled:
- **180x speedup**: V1 baseline (24-48h) → V2 (1-2h) → V3 (minutes)
- **93% compute savings**: Fit 200, publish 15 (not all 200)
- **Trading Agent**: Receives curated set of 15 diverse, validated models
- **All Agents**: Production-grade forecasts with 2,000 MC paths for risk analysis
