# Phase 1: Research Agent Code Analysis

**Analysis Date**: 2025-12-10
**Purpose**: Systematic code-first documentation of Research Agent Lambda functions and data infrastructure

---

## Lambda Functions (11 Total)

### 1. market-data-fetcher
**File**: `research_agent/infrastructure/lambda/functions/market-data-fetcher/app.py` (137 lines)

**What it does**:
- Fetches Coffee (KC=F) and Sugar (SB=F) futures prices via yfinance library
- Downloads OHLCV data (Open, High, Low, Close, Volume)

**Modes**:
- `HISTORICAL`: Backfill from 2015-01-01 to present
- `INCREMENTAL`: Fetch yesterday's data (weekdays only, skips weekends)

**Data source**: Yahoo Finance (yfinance Python library)

**Output**:
- Format: CSV
- Location: `s3://groundtruth-capstone/landing/market_data/`
- Columns: date, open, high, low, close, volume, commodity

**Code evidence**:
```python
# Lines 10-11
HISTORICAL_START_DATE = '2015-01-01'

# Lines 64, 75
coffee = yf.download("KC=F", start=START_DATE, end=END_DATE, progress=False, auto_adjust=True)
sugar = yf.download("SB=F", start=START_DATE, end=END_DATE, progress=False, auto_adjust=True)
```

---

### 2. weather-data-fetcher
**File**: `research_agent/infrastructure/lambda/functions/weather-data-fetcher/app.py` (623 lines)

**What it does**:
- Fetches weather data for 61 growing regions (25 Coffee + 20 Sugar Cane + 16 Sugar Beet)
- Uses Open-Meteo Archive API (historical) and Forecast API (current snapshot)

**Regions** (loaded from S3 config at `s3://groundtruth-capstone/config/region_coordinates.json`):
- **Coffee (25 regions)**: Minas_Gerais_Brazil, Sao_Paulo_Brazil, Espirito_Santo_Brazil, Bahia_Brazil, Central_Highlands_Vietnam, Sumatra_Indonesia, Java_Indonesia, Eje_Cafetero_Colombia, Huila_Colombia, Sidamo_Ethiopia, Yirgacheffe_Ethiopia, Copan_Honduras, Bugisu_Uganda, Rwenzori_Mountains_Uganda, Cajamarca_Peru, Karnataka_India, Kerala_India, CAR_Country_Average, Antigua_Guatemala, Guinea_Country_Average, Chiapas_Mexico, Veracruz_Mexico, Laos_Country_Average, Nicaragua_Country_Average, Yunnan_China_Coffee, Cote_dIvoire_Country_Average, Costa_Rica_Country_Average, Tanzania_Country_Average, Kenya_Country_Average
- **Sugar Cane (20 regions)**: Sao_Paulo_Brazil_Sugar, Uttar_Pradesh_India, Maharashtra_India, Guangxi_China, Yunnan_China_Sugar, Nakhon_Sawan_Thailand, Khon_Kaen_Thailand, Punjab_Pakistan, Sindh_Pakistan, Veracruz_Mexico_Sugar, Jalisco_Mexico, Java_Indonesia_Sugar, Queensland_Australia, Valle_del_Cauca_Colombia, South_Florida_USA, Louisiana_USA, Escuintla_Guatemala, Negros_Occidental_Philippines, KwaZulu_Natal_South_Africa, Argentina_Country_Average, Qena_Egypt_Cane, Cuba_Country_Average
- **Sugar Beet (16 regions)**: Voronezh_Russia, Tambov_Russia, Red_River_Valley_USA, Germany_Country_Average, France_Country_Average, Turkey_Country_Average, Poland_Country_Average, Ukraine_Country_Average, Nile_Delta_Egypt_Beet, North_China_Beet, UK_Country_Average, Netherlands_Country_Average, Iran_Country_Average, Belarus_Country_Average, Belgium_Country_Average, Hokkaido_Japan

**Weather variables (15 daily aggregates)**:
- Temperature (3): temperature_2m_max, temperature_2m_min, temperature_2m_mean
- Precipitation (4): precipitation_sum, rain_sum, snowfall_sum, precipitation_hours
- Humidity (3): relative_humidity_2m_mean, relative_humidity_2m_max, relative_humidity_2m_min
- Wind (3): wind_speed_10m_max, wind_gusts_10m_max, wind_direction_10m_dominant
- Solar/ET (2): shortwave_radiation_sum, et0_fao_evapotranspiration

**Modes**:
- `HISTORICAL`: Backfill from specified days_to_fetch list
- `CURRENT`: Real-time snapshot

**Output**:
- Format: CSV
- Location: `s3://groundtruth-capstone/landing/weather_v2/`

**Code evidence**:
```python
# Lines 84-261: 61 hardcoded regions in COMMODITY_REGIONS_V1_FALLBACK
# Lines 298-319: 15 daily weather variables
daily_vars = [
    "temperature_2m_max", "temperature_2m_min", "temperature_2m_mean",
    "precipitation_sum", "rain_sum", "snowfall_sum", "precipitation_hours",
    "relative_humidity_2m_mean", "relative_humidity_2m_max", "relative_humidity_2m_min",
    "wind_speed_10m_max", "wind_gusts_10m_max", "wind_direction_10m_dominant",
    "shortwave_radiation_sum", "et0_fao_evapotranspiration"
]
```

---

### 3. vix-data-fetcher
**File**: `research_agent/infrastructure/lambda/functions/vix-data-fetcher/app.py` (144 lines)

**What it does**:
- Fetches VIX (CBOE Volatility Index) from Federal Reserve Economic Data (FRED) API

**Data source**: FRED API series VIXCLS (VIX Daily Close)

**Modes**:
- `HISTORICAL`: Backfill from 1990-01-01 to present
- `INCREMENTAL`: Fetch last 7 days

**Output**:
- Format: CSV
- Location: `s3://groundtruth-capstone/landing/vix_data/`

**Code evidence**:
```python
# Line 12
HISTORICAL_START_DATE = '1990-01-01'

# Line 39
vix = fred.get_series('VIXCLS', observation_start=start_date)
```

---

### 4. fx-calculator-fetcher
**File**: `research_agent/infrastructure/lambda/functions/fx-calculator-fetcher/app.py` (239 lines)

**What it does**:
- Fetches 25+ foreign exchange rates plus macro indicators from FRED + World Bank APIs

**FRED series (15 FX rates + 3 macro indicators)**:
- FX: BRL_USD (Brazil), INR_USD (India), CNY_USD (China), THB_USD (Thailand), MXN_USD (Mexico), AUD_USD (Australia), EUR_USD (Eurozone), ZAR_USD (South Africa), JPY_USD (Japan), CHF_USD (Switzerland), KRW_USD (South Korea), GBP_USD (UK)
- Macro: OIL_WTI, USD_INDEX, US_10YR_RATE

**World Bank currencies (25)**: VND (Vietnam), COP (Colombia), IDN (Indonesia), ETH (Ethiopia), HNL (Honduras), UGX (Uganda), PEN (Peru), XAF (CAR), GTQ (Guatemala), GNF (Guinea), NIC (Nicaragua), CRC (Costa Rica), TZS (Tanzania), KES (Kenya), LAK (Laos), PKR (Pakistan), PHP (Philippines), EGY (Egypt), CUP (Cuba), ARS (Argentina), RUB (Russia), TRY (Turkey), UAH (Ukraine), IRR (Iran), BYN (Belarus)

**Total currencies**: 40 (15 FRED + 25 World Bank)

**Modes**:
- `HISTORICAL`: Backfill from 2015-01-01 to present
- `INCREMENTAL`: Fetch last 7 days

**Output**:
- Format: CSV
- Location: `s3://groundtruth-capstone/landing/macro_data/`

**Code evidence**:
```python
# Lines 66-82: 15 FRED series
fred_series = {
    'DEXBZUS': 'brl_usd',      # Brazil
    'DEXINUS': 'inr_usd',      # India
    # ... (15 total)
}

# Lines 99-129: 25 World Bank currencies
worldbank_currencies = [
    ('VNM', 'vnd'),  # Vietnam
    ('COL', 'cop'),  # Colombia
    # ... (25 total)
]
```

---

### 5. cftc-data-fetcher
**File**: `research_agent/infrastructure/lambda/functions/cftc-data-fetcher/app.py` (263 lines)

**What it does**:
- Fetches CFTC (Commodity Futures Trading Commission) Commitments of Traders reports
- Filters for Coffee and Sugar futures only

**Data source**: CFTC yearly ZIP files (2000-present)

**Incremental loading**:
- Checks S3 for last processed date in bronze layer
- Only fetches records newer than last processed date

**Columns extracted**:
- Market name, date, open interest, long/short positions (noncommercial, commercial), % of open interest

**Output**:
- Format: CSV
- Location: `s3://groundtruth-capstone/landing/cftc_data/`

**Code evidence**:
```python
# Line 17
START_YEAR = 2000

# Lines 54
relevant = df[df[market_col].str.contains('COFFEE|SUGAR', case=False, na=False)].copy()

# Lines 76-81: Columns extracted
cols_to_keep = [
    market_col, date_col, 'Open Interest (All)',
    'Noncommercial Positions-Long (All)', 'Noncommercial Positions-Short (All)',
    'Commercial Positions-Long (All)', 'Commercial Positions-Short (All)',
    '% of OI-Noncommercial-Long (All)', '% of OI-Noncommercial-Short (All)'
]
```

---

### 6. gdelt-daily-discovery
**File**: `research_agent/infrastructure/lambda/functions/gdelt-daily-discovery/lambda_function.py` (237 lines)

**What it does**:
- Discovers new GDELT GKG (Global Knowledge Graph) files not yet processed to bronze
- Streams GDELT master list, compares to DynamoDB tracking table
- Queues unprocessed files to SQS for bronze processing

**Date range**: 2021-01-01 to 2030-12-31

**Process**:
1. Download GDELT master list (streams line-by-line to avoid OOM)
2. Filter for GKG CSV files in date range
3. Check DynamoDB for files already processed (bronze_status='success')
4. Queue unprocessed files to SQS

**Output**:
- Queues CSV URLs to SQS: `groundtruth-gdelt-backfill-queue`

**Code evidence**:
```python
# Lines 30-31
START_DATE = '2021-01-01'
END_DATE = '2030-12-31'

# Lines 109-143: Streaming master list processing
with requests.get(GDELT_MASTER_LIST_URL, timeout=120, stream=True) as response:
    for line in response.iter_lines(decode_unicode=True):
        # Filter for .gkg.csv.zip files in date range
```

---

### 7. gdelt-bronze-transform
**File**: `research_agent/infrastructure/lambda/functions/gdelt-bronze-transform/lambda_function.py` (428 lines)

**What it does**:
- Converts JSONL → Bronze Parquet (backfill mode)
- Simple passthrough transformation (preserves all 27 GKG columns as strings)

**DynamoDB tracking**:
- Checks: `jsonl_status='success'` AND `bronze_status != 'success'`
- Updates: Marks `bronze_status='in_progress'` → `'success'` with record count

**Output**:
- Format: Parquet (snappy compression)
- Location: `s3://groundtruth-capstone/processed/gdelt/bronze/gdelt/`

**Code evidence**:
```python
# Lines 326-339: Checks for processing readiness
if item.get('jsonl_status') != 'success':
    return False, "jsonl_not_ready"

# Lines 253-256: Simple string conversion
for col in df_bronze.columns:
    df_bronze[col] = df_bronze[col].astype(str)
```

---

### 8. gdelt-csv-bronze-direct
**File**: `research_agent/infrastructure/lambda/functions/gdelt-csv-bronze-direct/lambda_function.py` (544 lines)

**What it does**:
- Converts CSV → Bronze Parquet directly (incremental mode, skips JSONL step)
- Downloads, filters, and transforms in one Lambda invocation

**Filtering logic** (commodity-relevant records only):
- **CORE_THEMES** (3): AGRICULTURE, FOOD_STAPLE, FOOD_SECURITY
- **DRIVER_THEMES** (40+): NATURAL_DISASTER, CLIMATE_CHANGE, TAX_DISEASE, TAX_PLANTDISEASE, TAX_PESTS, STRIKE, ECON_UNIONS, CRISIS_LOGISTICS, BLOCKADE, DELAY, CLOSURE, BORDER, ECON_FREETRADE, ECON_TRADE_DISPUTE, TAX_TARIFFS, ECON_SUBSIDIES, ECON_CURRENCY_EXCHANGE_RATE, ECON_STOCKMARKET, ECON_INTEREST_RATES, ECON_DEBT, ENERGY, OIL, LEGISLATION, GOV_REFORM, STATE_OF_EMERGENCY, ELECTION, CORRUPTION, GENERAL_GOVERNMENT, ECON_EARNINGSREPORT
- **COMMODITY_KEYWORDS** (6): coffee, arabica, robusta, sugar, sugarcane, sugar beet
- **DRIVER_KEYWORDS** (20+): drought, frost, flood, rainfall, la nina, el nino, fertilizer, pesticide, water scarcity, labor shortage, port congestion, shipping, inflation, recession, ethanol, biofuel, crude oil, tariff, trade deal, geopolitical, political instability

**GKG columns extracted** (all 27 fields):
- gkg_record_id, date, source_collection_id, source_common_name, source_url, counts, v2_counts, themes, v2_themes, locations, v2_locations, persons, v2_persons, organizations, v2_organizations, tone, dates, gcam, sharing_image, related_images, social_image_embeds, social_video_embeds, quotations, all_names, amounts, translation_info, extras

**DynamoDB tracking**:
- Deduplication table: `groundtruth-capstone-bronze-tracking` (prevents duplicate processing)
- Main tracking table: `groundtruth-capstone-file-tracking` (marks bronze_status='success')

**Event-driven silver processing**:
- After bronze success, extracts date from filename
- Queues unique dates to silver SQS queue for downstream processing

**Output**:
- Format: Parquet (snappy compression)
- Location: `s3://groundtruth-capstone/processed/gdelt/bronze/gdelt/`

**Code evidence**:
```python
# Lines 44-73: Theme and keyword filtering
CORE_THEMES = {'AGRICULTURE', 'FOOD_STAPLE', 'FOOD_SECURITY'}
DRIVER_THEMES = {
    'NATURAL_DISASTER', 'CLIMATE_CHANGE', 'TAX_DISEASE', 'TAX_PLANTDISEASE',
    'TAX_PESTS', 'ECON_SUBSIDIES', 'WB_2044_RURAL_WATER', 'STRIKE',
    # ... (40+ themes total)
}
COMMODITY_KEYWORDS = {'coffee', 'arabica', 'robusta', 'sugar', 'sugarcane', 'sugar beet'}

# Lines 286-314: All 27 GKG fields extracted
return {
    'gkg_record_id': row[0],
    'date': row[1],
    # ... (27 fields total)
}

# Lines 482-527: Event-driven silver queueing
queue_dates_for_silver(processed_dates)
```

---

### 9. gdelt-silver-backfill
**File**: `research_agent/infrastructure/lambda/functions/gdelt-silver-backfill/lambda_function.py` (758 lines)

**What it does**:
- Converts Bronze → Silver (wide format pivoted by themes)
- Processes one DATE at a time from SQS queue
- Creates wide format with theme groups and individual theme metrics

**Theme taxonomy** (43 tracked themes in 6 groups):
- **SUPPLY** (7): NATURAL_DISASTER, CLIMATE_CHANGE, TAX_DISEASE, TAX_PLANTDISEASE, TAX_PESTS, STRIKE, ECON_UNIONS
- **LOGISTICS** (6): CRISIS_LOGISTICS, CRISISLEX_C04_LOGISTICS_TRANSPORT, BLOCKADE, DELAY, CLOSURE, BORDER
- **TRADE** (6): ECON_FREETRADE, ECON_TRADE_DISPUTE, TAX_TARIFFS, ECON_SUBSIDIES, ECON_CURRENCY_EXCHANGE_RATE, WB_698_TRADE
- **MARKET** (9): ECON_STOCKMARKET, ECON_EARNINGSREPORT, ECON_INTEREST_RATES, ECON_DEBT, ECON_INFLATION, ECON_COST_OF_LIVING, ENERGY, OIL, ECON_BITCOIN
- **POLICY** (11): LEGISLATION, GOV_REFORM, GENERAL_GOVERNMENT, STATE_OF_EMERGENCY, ELECTION, CORRUPTION, NEGOTIATIONS, ALLIANCE, CEASEFIRE, EPU_POLICY, EPU_POLICY_GOVERNMENT
- **CORE** (4): AGRICULTURE, FOOD_STAPLE, FOOD_SECURITY, WB_2044_RURAL_WATER

**Processing steps**:
1. Read bronze parquet files for specific date (filename prefix filter)
2. Transform: Parse date, split tone fields, flag coffee/sugar commodities
3. Explode themes (one row per theme per article)
4. Aggregate: Count articles + average tone metrics by (date, commodity, theme)
5. Pivot: Create wide format with columns for each theme + theme_group

**Chunked processing for large dates**:
- If date has >30 bronze files, processes in batches of 25 files to avoid OOM errors
- Aggregates chunks incrementally using weighted averages

**DynamoDB tracking**:
- Creates `SILVER_{date}` entries in tracking table
- Tracks bronze completeness: 'complete', 'partial', or 'unknown'
- Records: bronze_files_found, bronze_files_expected, record_count, wide_rows

**Output**:
- Format: Parquet (snappy compression)
- Location: `s3://groundtruth-capstone/processed/gdelt/silver/gdelt_wide/`
- Partitions: article_date, commodity
- Columns: ~400+ (article_date, commodity, group_X_count, group_X_tone_avg, theme_X_count, theme_X_tone_avg, etc.)

**Code evidence**:
```python
# Lines 36-92: 43 themes in 6 groups
THEME_TO_GROUP = {
    # SUPPLY (7 themes)
    'NATURAL_DISASTER': 'SUPPLY',
    # ... (43 total themes)
}

# Lines 309-314: Chunked processing for large dates
if bronze_file_count > 30:
    logger.info(f"Large date detected ({bronze_file_count} files), processing in batches...")
    df = read_bronze_chunked(matching_files, date_str)

# Lines 584-657: Wide format aggregation
def create_wide_format(df: pd.DataFrame) -> pd.DataFrame:
    # Aggregate ALL themes, by theme_group, and by individual theme
    # Pivot to create ~400+ columns
```

---

### 10. gdelt-silver-discovery
**File**: `research_agent/infrastructure/lambda/functions/gdelt-silver-discovery/lambda_function.py` (329 lines)

**What it does**:
- Discovers dates needing silver processing
- Scans DynamoDB to find bronze files without corresponding silver status
- Identifies partial/old silver entries for re-processing

**Discovery logic**:
1. Scan DynamoDB for all entries
2. Extract dates from bronze files with `bronze_status='success'`
3. Check for `SILVER_{date}` entries with `silver_status='success'`
4. Identify dates needing re-processing:
   - Old entries without `bronze_completeness_status` field
   - Entries with `bronze_completeness_status='partial'`
5. Delete old SILVER entries to allow re-processing
6. Queue dates to silver SQS queue

**Output**:
- Queues dates (JSON: `{"date": "YYYY-MM-DD"}`) to SQS: `groundtruth-gdelt-silver-backfill-queue`

**Code evidence**:
```python
# Lines 159-174: Re-processing detection
if silver_status == 'success':
    has_completeness = 'bronze_completeness_status' in item
    if not has_completeness:
        # Old entry without completeness tracking - needs re-processing
        dates_needing_reprocess.add(date_str)
    elif item.get('bronze_completeness_status') == 'partial':
        # Partial bronze data - needs re-processing
        dates_needing_reprocess.add(date_str)
```

---

### 11. gdelt-silver-transform
**File**: `research_agent/infrastructure/lambda/functions/gdelt-silver-transform/lambda_function.py` (286 lines)

**What it does**:
- Legacy function for Bronze → Silver transformation
- Batch-oriented (processes date range instead of single date)
- Similar logic to gdelt-silver-backfill but without chunked processing

**Key differences from gdelt-silver-backfill**:
- No DynamoDB tracking (legacy)
- No chunked processing for large dates
- Batch date range processing instead of single-date SQS

**Theme groups** (simplified, 25 themes in 6 groups):
- Subset of themes from gdelt-silver-backfill (not all 43 themes)

**Output**:
- Format: Parquet (snappy compression)
- Location: `s3://groundtruth-capstone/processed/gdelt/silver/gdelt_wide/`
- Partitions: commodity only (not article_date)

**Code evidence**:
```python
# Lines 20-65: Simplified theme mapping (25 themes instead of 43)
THEME_TO_GROUP = {
    # SUPPLY (7), LOGISTICS (5), TRADE (5), MARKET (7), POLICY (6), CORE (3)
}
```

---

## SQL Table Creation (Gold Layer)

### create_gold_unified_data.sql
**File**: `research_agent/sql/create_gold_unified_data.sql` (118 lines)

**What it does**:
- Creates production gold table `commodity.gold.unified_data`
- Applies forward-fill to ALL features using LAST_VALUE window function
- Derives from `commodity.gold.unified_data_raw` (DRY architecture)

**Forward-fill pattern** (verified in code):
```sql
LAST_VALUE(open, true) OVER (
  PARTITION BY commodity
  ORDER BY date
  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
) as open
```

**24 FX currency pairs** (lines 71-94):
vnd_usd, cop_usd, idr_usd, etb_usd, hnl_usd, ugx_usd, pen_usd, xaf_usd, gtq_usd, gnf_usd, nio_usd, crc_usd, tzs_usd, kes_usd, lak_usd, pkr_usd, php_usd, egp_usd, ars_usd, rub_usd, try_usd, uah_usd, irr_usd, byn_usd

### create_gold_unified_data_raw.sql
**File**: `research_agent/sql/create_gold_unified_data_raw.sql` (326 lines)

**What it does**:
- Creates base gold table `commodity.gold.unified_data_raw`
- Preserves NULLs for custom imputation strategies
- Foundation table for production table (DRY design)

---

## Validation Scripts

### validate_gold_unified_data.py
**File**: `research_agent/tests/data_quality/gold/validate_gold_unified_data.py`

**What it does**:
- Validates gold table schema, completeness, array structures, data quality
- Tests: schema correctness, NULL patterns, array integrity

---

## Summary Statistics

**Lambda Functions**: 11 total
- Data fetchers: 5 (market, weather, VIX, FX, CFTC)
- GDELT pipeline: 6 (discovery, bronze transform, csv-bronze-direct, silver backfill, silver discovery, silver transform)

**Data Sources**:
- Yahoo Finance (yfinance): Coffee (KC=F), Sugar (SB=F) futures
- Open-Meteo API: Weather for 61 regions (25 Coffee + 20 Sugar Cane + 16 Sugar Beet)
- FRED API: VIX, 15 FX rates, macro indicators
- World Bank API: 25 FX rates
- CFTC: Commitments of Traders (Coffee, Sugar)
- GDELT: Global Knowledge Graph (news sentiment)

**Regions**: 61 total (weather data)
- Coffee: 25 regions
- Sugar Cane: 20 regions
- Sugar Beet: 16 regions

**FX Currencies**: 40 total (15 FRED + 25 World Bank)

**GDELT Themes**: 43 tracked themes in 6 groups (SUPPLY, LOGISTICS, TRADE, MARKET, POLICY, CORE)

**Gold Tables**: 2
- `commodity.gold.unified_data` (production, forward-filled)
- `commodity.gold.unified_data_raw` (experimental, NULLs preserved)

---

**Analysis complete**. Moving to Phase 2: Forecast Agent Code Analysis.
