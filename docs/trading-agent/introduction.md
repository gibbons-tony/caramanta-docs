---
sidebar_position: 1
---

# Trading Agent

The Trading Agent transforms probabilistic forecasts into actionable trading recommendations through systematic backtesting, strategy evaluation, and daily WhatsApp delivery to Colombian coffee traders.

## Mission

Convert 2,000 Monte Carlo forecast paths into optimal buy/hold/sell decisions, delivering daily recommendations via WhatsApp with multi-currency support for 15+ producer and consumer currencies.

## Two Production Workflows

### 1. Periodic Backtesting (Monthly/Quarterly)
**Purpose**: Evaluate strategy performance, identify best approaches

**Process**:
- Load latest forecasts from `commodity.forecast.distributions`
- Run 9 strategies across all commodity-model combinations
- Generate performance metrics (net earnings, Sharpe ratio, trades)
- Identify best strategy for each commodity-model pair
- Save results to Delta tables + pickle files
- Generate 220+ visualization charts

**Duration**: 10-15 min (Coffee), 30-45 min (All commodities)

### 2. Daily Operations (Every Day)
**Purpose**: Generate trading recommendations using best strategy

**Process**:
- Load today's forecast for specified model
- Load current state (inventory, price, history)
- Run all 9 strategies to generate recommendations
- Show SELL/HOLD decision with quantity and reasoning
- Output JSON for WhatsApp integration

**Duration**: < 1 minute

## The 70% Accuracy Threshold Discovery

**Research Question**: What forecast accuracy is needed for prediction-based strategies to outperform baselines?

**Methodology**: Synthetic model testing with controlled accuracy levels

### Synthetic Forecast Generation
Created calibrated forecasts with known directional accuracy:
- **50%** - Random (coin flip baseline)
- **60%** - Slightly better than random
- **70%** - Moderate accuracy
- **80%** - Good accuracy
- **90%** - Excellent accuracy
- **100%** - Perfect foresight (theoretical maximum)

**Accuracy calibration**: Add controlled noise to actual future prices to achieve target MAPE (e.g., 90% accuracy = 10% MAPE)

### Testing Framework
- **Coffee**: 9 strategies × 16 models (10 real + 6 synthetic) = 144 backtest scenarios
- **Sugar**: 9 strategies × 11 models (5 real + 6 synthetic) = 99 backtest scenarios
- **Total**: 243 backtest combinations

### Critical Finding

**70% directional accuracy is the minimum threshold** for prediction-based strategies to outperform baseline approaches.

**Below 70%**: Baseline strategies (Immediate Sale, Equal Batches) perform better → Don't use forecasts, just sell methodically

**Above 70%**: Prediction-based strategies (Expected Value, Consensus) show significant improvement → Forecasts add value

**Implication**: Only deploy forecasting models that achieve 70%+ directional accuracy. Otherwise, simpler baseline strategies are more profitable.

## 9 Trading Strategies

### Baseline Strategies (4)
**No forecast required - mechanical rules only**

1. **Immediate Sale** - Weekly liquidation regardless of price
2. **Equal Batches** - Fixed 25% every 30 days
3. **Price Threshold** - Sell when price > moving average + threshold
4. **Moving Average** - Sell on MA crossover

**Use when**: Forecast accuracy < 70% or no forecasts available

### Prediction-Based Strategies (5)
**Require forecast input - use 2,000 MC paths**

1. **Consensus** - Sell when 70%+ of 2,000 paths are bullish
2. **Expected Value** - Maximize expected returns (mean of paths)
3. **Risk-Adjusted** - Balance returns vs uncertainty (Sharpe-like)
4. **Price Threshold Predictive** - Baseline #3 + forecast enhancement
5. **Moving Average Predictive** - Baseline #4 + forecast enhancement

**Use when**: Forecast accuracy ≥ 70%

## Expected Value Strategy (Production - Coffee)

**Proven Result**: +3.4% gain vs Immediate Sale baseline for Coffee

### Decision Logic
```python
for each future day (1-14):
    expected_price = median(2000 Monte Carlo paths)
    storage_cost = current_price × 0.025% × days_held
    transaction_cost = expected_price × 0.25%

    net_expected_value = expected_price - storage_cost - transaction_cost

if max(net_expected_value) - current_price > $50/ton:
    HOLD (sell on optimal day)
else:
    SELL NOW (expected gain too small)
```

### Parameters (Calibrated from Backtesting)
- **Storage cost**: 0.025% of value per day
- **Transaction cost**: 0.25% of sale value
- **Minimum gain threshold**: $50/ton
- **Inventory size**: 50 tons (default)

## WhatsApp Integration

**Status**: Production-ready with AWS Lambda + Twilio integration

### Features
- **Real-time data**: Queries Databricks for latest forecasts and prices
- **Multi-currency**: Automatic conversion to 15+ currencies (COP, VND, BRL, INR, THB, IDR, ETB, HNL, UGX, MXN, PEN, USD, EUR, GBP, JPY, CNY, AUD, CHF, KRW, ZAR)
- **QR code onboarding**: Scan to join, instant Coffee recommendation
- **Commands**: `coffee`, `sugar`, `exit`, auto-help for unrecognized messages

### Message Format
```
☕ COFFEE MARKET UPDATE
Date: 2024-12-10

CURRENT MARKET
Price: $3,930/ton
7-Day Trend: -6.6%

FORECAST (14 days)
Range: $2,984-$3,150/ton
Best Sale Window: Days 9-11

YOUR INVENTORY
Stock: 50 tons
Hold Duration: 10 days

RECOMMENDATION
✅ SELL NOW
Expected to gain $125/ton

Next update: Tomorrow 6 AM
```

### Technical Implementation
- **Lambda Function**: berkeley-datasci210-capstone-processor (us-west-2, 19MB)
- **Twilio WhatsApp**: +1 415 523 8886 (Sandbox for testing)
- **Data Source**: Databricks REST API (real-time market data)
- **Response Time**: 10-15 seconds typical
- **All Message Flows Verified**: Join, Coffee, Sugar, Exit, Help

## Production System Components

### Scripts (1,446 lines production code)
- `data_loader.py` (250 lines) - Load prices and predictions
- `strategy_runner.py` (350 lines) - Execute strategy backtests
- `visualization.py` (400 lines) - Generate performance charts
- `result_saver.py` (200 lines) - Save to Delta + pickle
- `multi_commodity_runner.py` (246 lines) - Orchestrate all combinations

### Strategies (1,900 lines)
- 4 baseline implementations
- 5 prediction-based implementations
- Harvest-aware position sizing
- Transaction cost modeling

### Test Suite (2,500 lines, 93%+ coverage)
- 6 test files
- Unit tests (80%), integration tests (15%), smoke tests (5%)
- Validates all 9 strategies across synthetic scenarios

## Data Architecture

### Input Tables (Unity Catalog)

**commodity.forecast.distributions**
- 2,000 Monte Carlo paths per forecast
- 14-day horizon
- Coffee: 10 models, Sugar: 5 models

**commodity.bronze.market_data**
- Historical OHLCV prices
- Trading days coverage

**commodity.bronze.fx_rates**
- 24 currency pairs
- Daily rates for multi-currency support

**Zero CSV dependencies** - All data via Databricks SQL connection

### Output Tables

**commodity.trading_agent.results_{commodity}_{model}**
- Strategy performance metrics
- Net earnings, total revenue, costs, Sharpe ratio
- Number of trades, days to liquidate

**Pickle Files** (detailed results)
- Daily state DataFrames
- Trade-by-trade logs
- Complete audit trail

**Visualizations** (220+ charts)
- Cumulative earnings by strategy
- Inventory timeline
- Price vs sales timing
- Strategy heatmaps

## Performance Metrics

### Return Metrics
- Net earnings (revenue - costs)
- Total revenue (gross sales)
- Transaction costs (0.25% of sale value)
- Number of transactions

### Risk Metrics
- Sharpe ratio (risk-adjusted returns)
- Days to liquidate
- Storage costs incurred

### Trading Metrics
- Optimal sale timing
- Price capture vs benchmark
- Strategy efficiency vs theoretical max

## Multi-Model Backtesting

Test all strategies across all forecasting models:

**Coffee Coverage** (16 total models):
- 10 real models from Forecast Agent
- 6 synthetic accuracy levels (50%-100%)
- 9 strategies × 16 models = 144 scenarios

**Sugar Coverage** (11 total models):
- 5 real models from Forecast Agent
- 6 synthetic accuracy levels (50%-100%)
- 9 strategies × 11 models = 99 scenarios

**Total**: 243 backtest combinations

**Output**: Identify which model/strategy combinations perform best for production deployment

## Documentation

For detailed implementation:
- **Production System**: [production/README.md](https://github.com/gibbonstony/ucberkeley-capstone/blob/main/trading_agent/production/README.md)
- **WhatsApp Integration**: [whatsapp/README.md](https://github.com/gibbonstony/ucberkeley-capstone/blob/main/trading_agent/whatsapp/README.md)
- **Operations Guide**: [operations/README.md](https://github.com/gibbonstony/ucberkeley-capstone/blob/main/trading_agent/operations/README.md)

## Code Repository

📂 **[View Trading Agent Code on GitHub](https://github.com/gibbonstony/ucberkeley-capstone/tree/main/trading_agent)**

## Impact

The Trading Agent's production system enables:
- **70% threshold discovery**: Evidence-based minimum forecast accuracy requirement
- **Daily recommendations**: WhatsApp delivery with multi-currency support
- **Multi-model comparison**: 243 backtest scenarios identify optimal combinations
- **Production-ready**: 93%+ test coverage, real-time Databricks integration
- **Colombian traders**: COP currency conversion, local market context
