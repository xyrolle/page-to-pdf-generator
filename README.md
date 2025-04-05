# Page to PDF Generator

A command-line tool for generating PDF files from web pages with customizable options, supporting multiple device types (desktop, tablet, mobile).

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
node generate-pdf.js [url] [outputFilename] [initialDelay] [pageDelay] [deviceTypes...]
```

If no arguments are provided, the tool will prompt you for the necessary information.

### Options

- **url**: The URL of the web page to convert (e.g., https://example.com)
- **outputFilename**: The name of the output PDF file (extension will be added if missing)
- **initialDelay**: Initial delay in seconds before capturing the page (0-30 seconds)
- **pageDelay**: Delay between capturing pages in seconds for multi-page content (0-10 seconds)
- **deviceTypes**: One or more device types to generate PDFs for (`desktop`, `tablet`, `mobile`)

### Device Presets

The tool includes the following device presets:

- **Desktop**: 1920×1080 pixels
- **Tablet**: 768×1024 pixels
- **Mobile**: 375×667 pixels

When selecting multiple device types, the tool will generate separate PDFs for each type, appending the device type to the filename (e.g., `landing-page-desktop.pdf`, `landing-page-mobile.pdf`).

### Interactive Mode

If you run the tool without command-line arguments, it will enter interactive mode and prompt you for each option:

```bash
node generate-pdf.js
```

The interactive mode includes:
- Checkbox selection for device types (desktop, tablet, mobile)
- Delay settings for page capture

## Features

- Automatically handles popups and dialogs
- Generates PDFs using predefined device dimensions
- Handles multi-page content with configurable delays
- Checks website availability before attempting to generate PDF
- Interactive mode for easy use
- Generate PDFs for multiple device types (desktop, tablet, mobile)
- Device-specific user agents for mobile and tablet views

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 