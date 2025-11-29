# Usage Guide

## Step-by-Step Instructions

### 1. Select API Type

- **Company Daily Records**: Get detailed data for all listed companies
- **Market Daily Summary**: Get overall market statistics for the day

### 2. Run Test

- Click "Run Test" to fetch the latest data
- The service will fetch and parse the daily report
- Results will be displayed in both formatted view and raw JSON

## Data Structure

### Company Records

Each company record includes:

- `code`: Stock code
- `name`: Company name
- `lastPrice`: Latest/closing price (SAR)
- `changePercent`: Percentage change
- `volume`: Trading volume
- `turnover`: Trading value (SAR)
- `marketCap`: Market capitalization (SAR)
- `date`: Report date (YYYY-MM-DD)

### Market Summary

Includes:

- `open`, `high`, `low`, `close`: Market indices (SAR)
- `change`, `changePercent`: Market change
- `companiesTraded`: Number of companies traded
- `volumeTraded`: Total trading volume
- `valueTraded`: Total trading value (SAR)
- `marketCap`: Total market capitalization (SAR)
- `date`: Report date (YYYY-MM-DD)

## Authentication

This page uses cookie-based authentication. You must be logged in to access the test page. The API endpoints also support token-based authentication for programmatic access.
