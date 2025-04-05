# Page to PDF Generator

A command-line tool for generating PDF files from web pages with customizable options.

## Installation

```bash
# Clone the repository
git clone https://github.com/xyrolle/page-to-pdf-generator.git

# Navigate to the project directory
cd page-to-pdf-generator

# Install dependencies
npm install

# Build the TypeScript code
npx tsc
```

## Usage

```bash
node generate-pdf.js [url] [outputFilename] [initialDelay] [pageDelay] [width] [height]
```

If no arguments are provided, the tool will prompt you for the necessary information.

### Options

- **url**: The URL of the web page to convert (e.g., https://example.com)
- **outputFilename**: The name of the output PDF file (must end with .pdf)
- **initialDelay**: Initial delay in seconds before capturing the page (0-30 seconds)
- **pageDelay**: Delay between capturing pages in seconds for multi-page content (0-10 seconds)
- **width**: PDF width in pixels (default: 794, which corresponds to A4 width)
- **height**: PDF height in pixels (default: 1123, which corresponds to A4 height)

### Interactive Mode

If you run the tool without command-line arguments, it will enter interactive mode and prompt you for each option:

```bash
node generate-pdf.js
```

## Features

- Automatically handles popups and dialogs
- Supports custom page dimensions
- Handles multi-page content with configurable delays
- Checks website availability before attempting to generate PDF
- Interactive mode for easy use

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 