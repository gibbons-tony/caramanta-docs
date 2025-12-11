---
sidebar_position: 1
---

# Trading Agent

Trading strategy backtesting framework for commodity markets.

## Strategy Implementations

10 strategy classes in `production/strategies/`:

---

### Baseline (4 strategies)
**File**: `baseline.py` (12,719 bytes)

#### 1. ImmediateSaleStrategy (line 29)
- Sell entire harvest immediately each week
- No forecasting, no waiting for better prices
- Benchmark: worst-case scenario

#### 2. EqualBatchStrategy (line 73)
- Divide harvest into equal batches
- Sell on fixed schedule (e.g., weekly, bi-weekly)
- Simple time-averaging approach

#### 3. PriceThresholdStrategy (line 110)
- Sell when price exceeds threshold
- Uses technical indicators (RSI, Bollinger Bands)
- Fallback: sell remaining at deadline

#### 4. MovingAverageStrategy (line 220)
- Buy/sell signals from MA crossover
- Uses short-term and long-term moving averages
- Classic technical analysis approach

---

### Prediction-Based (5 strategies)
**File**: `prediction.py` (50,018 bytes)

#### 5. PriceThresholdPredictive (line 46)
- Extends PriceThresholdStrategy with forecast-based thresholds
- Uses probabilistic forecasts (2,000 Monte Carlo paths) to set dynamic thresholds

#### 6. MovingAveragePredictive (line 387)
- Extends MovingAverageStrategy with forecasts
- Combines MA signals with forecast direction

#### 7. ExpectedValueStrategy (line 736)
- Maximizes expected return using forecast distributions
- Sells when expected value of selling > expected value of holding
- Evaluates all 2,000 forecast paths for decision making

#### 8. ConsensusStrategy (line 873)
- Majority vote across forecast paths
- Sells when majority of 2,000 paths predict up-trend
- Democratic ensemble approach

#### 9. RiskAdjustedStrategy (line 1035)
- Balances returns vs. forecast uncertainty
- Uses Sharpe ratio / risk-adjusted return metrics
- Accounts for volatility in forecast distribution

---

### Model Predictive Control (1 strategy)
**File**: `rolling_horizon_mpc.py` (11,548 bytes)

#### 10. RollingHorizonMPC (line 39)
- Rolling horizon optimization
- Re-optimizes selling schedule at each time step
- Uses linear programming for multi-period decisions
- Most sophisticated optimization approach

---

## Production System

**Runners**: `production/runners/*.py` - **2,172 total lines**

### 1. data_loader.py (353 lines)
- Loads historical price data and forecasts from Databricks
- Loads forecast distributions (2,000 Monte Carlo paths)
- Handles multi-commodity data (Coffee + Sugar)

**Key methods**:
- `load_price_data()`: Historical prices from gold tables
- `load_forecast_data()`: Forecast distributions
- `load_multi_commodity_data()`: Multiple commodities

### 2. strategy_runner.py (391 lines)
- Runs individual strategy backtests
- Executes strategy logic across historical periods
- Collects execution metrics (return, timing, quantity sold)

**Key methods**:
- `run_backtest()`: Execute strategy on historical data
- `calculate_metrics()`: Compute performance metrics
- `save_execution_log()`: Log trading decisions

### 3. multi_commodity_runner.py (526 lines)
- Orchestrates backtesting across multiple commodities
- Parallel strategy execution
- Aggregates results across commodities

**Key methods**:
- `run_all_strategies()`: Execute all strategies
- `run_multi_commodity()`: Coffee + Sugar backtests
- `aggregate_results()`: Combine metrics

### 4. result_saver.py (346 lines)
- Saves backtest results to Databricks Delta Lake
- Schema: strategy_name, commodity, metrics, execution_log
- Supports incremental updates

**Key methods**:
- `save_to_databricks()`: Write results to Delta Lake
- `save_execution_details()`: Save trade-level details
- `save_comparison_matrix()`: Strategy comparison table

### 5. visualization.py (510 lines)
- Creates charts for backtest analysis
- Price evolution vs. strategy decisions
- Performance comparison charts
- Return distribution visualizations

**Key methods**:
- `plot_strategy_execution()`: Trade timing on price chart
- `plot_performance_comparison()`: Bar charts of returns
- `plot_forecast_distributions()`: Monte Carlo path visualization

### 6. __init__.py (46 lines)
- Package initialization
- Exports key classes and functions

---

## Strategy Support Files

### indicators.py (4,624 bytes)
- Technical indicator calculations
- RSI (Relative Strength Index)
- Bollinger Bands
- Moving Averages

### brute_force_optimizer.py (10,094 bytes)
- Brute force parameter search
- Grid search for strategy hyperparameters

### lp_optimizer.py (7,069 bytes)
- Linear programming optimization
- Sell schedule optimization using LP solver

### theoretical_max_calculator.py (10,684 bytes)
- Perfect foresight benchmark calculator
- Theoretical maximum return (upper bound)

---

## Summary

**Strategies**: 10 total
- **Baseline (4)**: ImmediateSale, EqualBatch, PriceThreshold, MovingAverage
- **Predictive (5)**: PriceThresholdPredictive, MovingAveragePredictive, ExpectedValue, Consensus, RiskAdjusted
- **Optimization (1)**: RollingHorizonMPC

**Forecast integration**: Uses 2,000 Monte Carlo paths per forecast for probabilistic decision making

**Multi-currency support**: Handles 15+ currencies including COP (Colombian Peso)

**Backtesting framework**: 2,172 lines of runner code across 6 files

**Execution metrics**: Return, timing, quantity sold, trade-level details

**Persistence**: Results saved to Databricks Delta Lake

---

## Code Repository

📂 [View Code on GitHub](https://github.com/gibbonstony/ucberkeley-capstone/tree/main/trading_agent)
