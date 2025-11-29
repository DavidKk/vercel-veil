# TASI Finance Data Fetcher

This tool fetches and parses daily finance data from the Saudi Stock Exchange (Tadawul).

## How It Works

1. **Fetch Daily Report**: The service fetches the HTML daily report from the Saudi Exchange website
2. **Parse HTML**: Uses CSS selectors to extract structured data from the HTML table
3. **Data Extraction**:
   - **Company Records**: Extracts individual company stock data (price, volume, market cap, etc.)
   - **Market Summary**: Extracts overall market statistics (open, high, low, close, volume, etc.)
4. **Data Normalization**: Converts extracted text to structured JSON with proper data types
5. **Date Extraction**: Parses the report date from the page

## API Endpoints

- **Company Daily Records**: `/api/finance/tasi/company/daily`
  - Returns array of company stock records
- **Market Daily Summary**: `/api/finance/tasi/summary/daily`
  - Returns single object with market statistics

Both endpoints support cookie-based authentication (for logged-in users) or token-based authentication (for third-party access).
