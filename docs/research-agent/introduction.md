---
sidebar_position: 1
---

# Research Agent

Data infrastructure for commodity forecasting, transforming raw market data into production-ready ML tables on Databricks.

## Lambda Functions (11 Total)

### Data Fetchers (5 Functions)

#### 1. market-data-fetcher
**Source**: `research_agent/infrastructure/lambda/functions/market-data-fetcher/app.py` (137 lines)
- **What it does**: Fetches Coffee (KC=F) and Sugar (SB=F) futures prices via yfinance
- **Data**: OHLCV (Open, High, Low, Close, Volume)
- **Modes**: HISTORICAL (2015-01-01 onward) | INCREMENTAL (yesterday only, weekdays)
- **Output**: CSV → `s3://groundtruth-capstone/landing/market_data/`

#### 2. weather-data-fetcher
**Source**: `research_agent/infrastructure/lambda/functions/weather-data-fetcher/app.py` (623 lines)
- **What it does**: Fetches weather data for 61 growing regions via Open-Meteo API
- **Regions**: 25 Coffee + 20 Sugar Cane + 16 Sugar Beet
- **Variables**: 15 daily aggregates (temp, precipitation, humidity, wind, solar, ET)
- **Output**: CSV → `s3://groundtruth-capstone/landing/weather_v2/`

#### 3. vix-data-fetcher
**Source**: `research_agent/infrastructure/lambda/functions/vix-data-fetcher/app.py` (144 lines)
- **What it does**: Fetches VIX volatility index from FRED API (series: VIXCLS)
- **Modes**: HISTORICAL (1990-01-01 onward) | INCREMENTAL (last 7 days)
- **Output**: CSV → `s3://groundtruth-capstone/landing/vix_data/`

#### 4. fx-calculator-fetcher
**Source**: `research_agent/infrastructure/lambda/functions/fx-calculator-fetcher/app.py` (239 lines)
- **What it does**: Fetches 40 FX currency pairs from FRED + World Bank APIs
- **FRED currencies**: 15 (BRL, INR, CNY, THB, MXN, AUD, EUR, ZAR, JPY, CHF, KRW, GBP, + 3 macro)
- **World Bank currencies**: 25 (VND, COP, IDR, ETB, HNL, UGX, PEN, XAF, GTQ, GNF, NIC, CRC, TZS, KES, LAK, PKR, PHP, EGY, CUP, ARS, RUB, TRY, UAH, IRR, BYN)
- **Output**: CSV → `s3://groundtruth-capstone/landing/macro_data/`

#### 5. cftc-data-fetcher
**Source**: `research_agent/infrastructure/lambda/functions/cftc-data-fetcher/app.py` (263 lines)
- **What it does**: Fetches CFTC Commitments of Traders data for Coffee and Sugar
- **Source**: CFTC yearly ZIP files (2000-present)
- **Incremental loading**: Checks S3 for last processed date, fetches only newer records
- **Output**: CSV → `s3://groundtruth-capstone/landing/cftc_data/`

---

### GDELT Pipeline (6 Functions)

#### 6. gdelt-daily-discovery
**Source**: `research_agent/infrastructure/lambda/functions/gdelt-daily-discovery/lambda_function.py` (237 lines)
- **What it does**: Discovers new GDELT GKG files not yet processed to bronze
- **Process**: Streams GDELT master list, compares to DynamoDB tracking table
- **Date range**: 2021-01-01 to 2030-12-31
- **Output**: Queues CSV URLs to SQS (`groundtruth-gdelt-backfill-queue`)

#### 7. gdelt-bronze-transform
**Source**: `research_agent/infrastructure/lambda/functions/gdelt-bronze-transform/lambda_function.py` (428 lines)
- **What it does**: Converts JSONL → Bronze Parquet (backfill mode)
- **DynamoDB tracking**: Checks `jsonl_status='success'`, marks `bronze_status`
- **Output**: Parquet → `s3://groundtruth-capstone/processed/gdelt/bronze/gdelt/`

#### 8. gdelt-csv-bronze-direct
**Source**: `research_agent/infrastructure/lambda/functions/gdelt-csv-bronze-direct/lambda_function.py` (544 lines)
- **What it does**: Converts CSV → Bronze Parquet directly (incremental mode, skips JSONL)
- **Filtering**: 43 tracked themes (CORE + DRIVER), commodity keywords
- **GKG columns**: All 27 fields preserved
- **Event-driven**: Queues dates to silver SQS after bronze success
- **Output**: Parquet → `s3://groundtruth-capstone/processed/gdelt/bronze/gdelt/`

#### 9. gdelt-silver-backfill
**Source**: `research_agent/infrastructure/lambda/functions/gdelt-silver-backfill/lambda_function.py` (758 lines)
- **What it does**: Converts Bronze → Silver (wide format pivoted by themes)
- **Processing**: One date at a time from SQS queue
- **Theme taxonomy**: 43 themes in 6 groups (SUPPLY, LOGISTICS, TRADE, MARKET, POLICY, CORE)
- **Chunked processing**: For dates >30 files, processes in batches to avoid OOM
- **Output**: Parquet → `s3://groundtruth-capstone/processed/gdelt/silver/gdelt_wide/`

#### 10. gdelt-silver-discovery
**Source**: `research_agent/infrastructure/lambda/functions/gdelt-silver-discovery/lambda_function.py` (329 lines)
- **What it does**: Discovers dates needing silver processing
- **Logic**: Scans DynamoDB for bronze success without corresponding silver success
- **Re-processing**: Identifies partial/old silver entries, deletes for re-processing
- **Output**: Queues dates to silver SQS queue

#### 11. gdelt-silver-transform
**Source**: `research_agent/infrastructure/lambda/functions/gdelt-silver-transform/lambda_function.py` (286 lines)
- **What it does**: Legacy Bronze → Silver transformation (batch mode)
- **Note**: Similar to gdelt-silver-backfill but batch-oriented, no chunked processing

---

## Gold Layer Architecture

### `commodity.gold.unified_data` (Production)
**Source**: `research_agent/sql/create_gold_unified_data.sql` (118 lines)
- Forward-filled features for immediate use
- SQL implementation uses `LAST_VALUE` with `ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` pattern
- 24 FX currency pairs (verified lines 71-94)
- DRY Design: Built FROM `commodity.gold.unified_data_raw` (single source of truth)

### `commodity.gold.unified_data_raw` (Experimental)
**Source**: `research_agent/sql/create_gold_unified_data_raw.sql` (326 lines)
- Preserves NULLs for custom imputation strategies
- Includes missingness indicator flags
- Foundation table for production table

---

## Data Features

**Market Data**: OHLCV (open, high, low, close, volume)

**Volatility**: VIX

**Currency**: 24 FX pairs (vnd_usd, cop_usd, idr_usd, etb_usd, hnl_usd, ugx_usd, pen_usd, xaf_usd, gtq_usd, gnf_usd, nio_usd, crc_usd, tzs_usd, kes_usd, lak_usd, pkr_usd, php_usd, egp_usd, ars_usd, rub_usd, try_usd, uah_usd, irr_usd, byn_usd)

**Regional**: weather_data (array), gdelt_themes (array)

**Source**: Verified in `create_gold_unified_data.sql` lines 71-94 (FX), 99 (weather), 108 (GDELT)

---

## Validation

**Python validation script**: `tests/data_quality/gold/validate_gold_unified_data.py`

Tests schema, completeness, array structures, and data quality.

---

## Code Repository

📂 [View Code on GitHub](https://github.com/gibbonstony/ucberkeley-capstone/tree/main/research_agent)
