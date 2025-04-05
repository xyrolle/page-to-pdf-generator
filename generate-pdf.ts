import puppeteer, { PaperFormat } from 'puppeteer';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs';

interface DeviceViewport {
  width: number;
  height: number;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
}

const DEVICE_PRESETS: Record<string, DeviceViewport> = {
  desktop: {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false
  },
  tablet: {
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  },
  mobile: {
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  }
};

async function promptForArgs(): Promise<{ 
  url: string; 
  outputFilename: string; 
  initialDelay: number;
  pageDelay: number;
  width: number;
  height: number;
  deviceTypes: string[];
  customViewport: boolean;
}> {
  console.log('Landing Page PDF Generator');
  console.log('--------------------------------');
  
  const urlAnswer = await inquirer.prompt({
    type: 'input',
    name: 'url',
    message: 'Enter website URL:',
    default: 'https://example.com',
    validate: (input: string) => {
      try {
        new URL(input);
        return true;
      } catch (error) {
        return 'Please enter a valid URL';
      }
    }
  });
  
  const filenameAnswer = await inquirer.prompt({
    type: 'input',
    name: 'outputFilename',
    message: 'Enter output filename (without extension):',
    default: 'landing-page',
    validate: (input: string) => {
      return input.length > 0 
        ? true 
        : 'Filename must not be empty';
    }
  });
  
  const deviceTypeAnswer = await inquirer.prompt({
    type: 'checkbox',
    name: 'deviceTypes',
    message: 'Select device types to generate PDFs for:',
    choices: [
      { name: 'Desktop (1920×1080)', value: 'desktop', checked: true },
      { name: 'Tablet (768×1024)', value: 'tablet' },
      { name: 'Mobile (375×667)', value: 'mobile' }
    ],
    validate: (input) => {
      if (!input || input.length === 0) {
        return 'Please select at least one device type';
      }
      return true;
    }
  });
  
  const customViewportAnswer = await inquirer.prompt({
    type: 'confirm',
    name: 'customViewport',
    message: 'Do you want to specify custom dimensions?',
    default: false,
    when: () => deviceTypeAnswer.deviceTypes.length > 0
  });
  
  let width = 794;  // Default A4 width
  let height = 1123; // Default A4 height
  
  if (customViewportAnswer.customViewport) {
    const widthAnswer = await inquirer.prompt({
      type: 'number',
      name: 'width',
      message: 'PDF width in pixels:',
      default: 794, // Default A4 width
      validate: (input: number | undefined) => {
        if (input === undefined) return 'Please enter a number';
        return input > 0 && input <= 5000
          ? true
          : 'Width must be between 1 and 5000 pixels';
      }
    });
    
    const heightAnswer = await inquirer.prompt({
      type: 'number',
      name: 'height',
      message: 'PDF height in pixels:',
      default: 1123, // Default A4 height
      validate: (input: number | undefined) => {
        if (input === undefined) return 'Please enter a number';
        return input > 0 && input <= 5000
          ? true
          : 'Height must be between 1 and 5000 pixels';
      }
    });
    
    width = widthAnswer.width;
    height = heightAnswer.height;
  }
  
  const initialDelayAnswer = await inquirer.prompt({
    type: 'number',
    name: 'initialDelay',
    message: 'Initial delay in seconds before capturing page:',
    default: 2,
    validate: (input: number | undefined) => {
      if (input === undefined) return 'Please enter a number';
      return input >= 0 && input <= 30
        ? true
        : 'Delay must be between 0 and 30 seconds';
    }
  });
  
  const pageDelayAnswer = await inquirer.prompt({
    type: 'number',
    name: 'pageDelay',
    message: 'Delay between capturing pages in seconds:',
    default: 1,
    validate: (input: number | undefined) => {
      if (input === undefined) return 'Please enter a number';
      return input >= 0 && input <= 10
        ? true
        : 'Delay must be between 0 and 10 seconds';
    }
  });
  
  return {
    url: urlAnswer.url,
    outputFilename: filenameAnswer.outputFilename,
    initialDelay: initialDelayAnswer.initialDelay,
    pageDelay: pageDelayAnswer.pageDelay,
    width,
    height,
    deviceTypes: deviceTypeAnswer.deviceTypes,
    customViewport: customViewportAnswer.customViewport || false
  };
}

async function checkSiteHealth(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      
      const req = protocol.get(url, (res) => {
        const statusCode = res.statusCode ?? 0;
        
        if (statusCode >= 200 && statusCode < 400) {
          console.log(`Site is up and running. Status code: ${statusCode}`);
          resolve(true);
        } else {
          console.error(`Site returned error status code: ${statusCode}`);
          resolve(false);
        }
        
        res.resume();
      });
      
      req.on('error', (err) => {
        console.error(`Failed to connect to the site: ${err.message}`);
        resolve(false);
      });
      
      req.setTimeout(10000, () => {
        console.error('Request timed out after 10 seconds');
        req.destroy();
        resolve(false);
      });
    } catch (error) {
      console.error(`Error checking site health: ${error}`);
      resolve(false);
    }
  });
}

async function generatePDF(
  url: string, 
  outputFilename: string = 'landing-page', 
  initialDelay: number = 0,
  pageDelay: number = 0,
  width: number = 794,
  height: number = 1123,
  deviceTypes: string[] = ['desktop'],
  customViewport: boolean = false
): Promise<void> {
  const isHealthy = await checkSiteHealth(url);
  if (!isHealthy) {
    throw new Error(`Site is not available: ${url}`);
  }

  const browser = await puppeteer.launch();
  
  // Generate PDFs for each selected device type
  for (const deviceType of deviceTypes) {
    const page = await browser.newPage();
    
    page.on('dialog', async (dialog) => {
      console.log(`Auto-dismissing dialog: ${dialog.message()}`);
      await dialog.dismiss();
    });
    
    if (customViewport) {
      // If custom viewport is specified, use the provided dimensions
      await page.setViewport({ width, height });
    } else {
      // Otherwise use device preset
      const viewport = DEVICE_PRESETS[deviceType];
      await page.setViewport(viewport);
      
      if (deviceType === 'mobile' || deviceType === 'tablet') {
        // Set user agent for mobile/tablet
        await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1');
      }
    }
    
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    try {
      console.log(`[${deviceType}] Attempting to close any popups by clicking on the page...`);
      
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
      
      const dimensions = await page.evaluate(() => {
        return {
          width: window.innerWidth,
          height: window.innerHeight
        };
      });
      
      await page.mouse.click(dimensions.width - 50, 50);
      console.log(`[${deviceType}] Clicked top-right corner to dismiss possible popups`);
      
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
      
      await page.mouse.click(dimensions.width / 2, dimensions.height / 2);
      console.log(`[${deviceType}] Clicked center of page to dismiss possible popups`);
      
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
      
      await page.keyboard.press('Escape');
      console.log(`[${deviceType}] Pressed Escape key to dismiss possible popups`);
      
    } catch (error) {
      console.log(`[${deviceType}] Error handling popups: ${error}`);
    }
    
    if (initialDelay > 0) {
      console.log(`[${deviceType}] Waiting initial ${initialDelay} seconds for page to fully load...`);
      await page.evaluate((delayMs) => {
        return new Promise(resolve => setTimeout(resolve, delayMs));
      }, initialDelay * 1000);
    }

    // Create device-specific filename
    const fileExt = '.pdf';
    const fileBaseName = path.basename(outputFilename, fileExt);
    const deviceSpecificFilename = `${fileBaseName}${deviceTypes.length > 1 ? `-${deviceType}` : ''}${fileExt}`;
    
    const viewport = page.viewport();
    if (viewport) {
      console.log(`[${deviceType}] Generating PDF with viewport: ${viewport.width}x${viewport.height}`);
    } else {
      console.log(`[${deviceType}] Generating PDF`);
    }
    
    if (pageDelay > 0) {
      console.log(`[${deviceType}] Using ${pageDelay} second delay between pages for multi-page content`);
      
      const pageHeight = await page.evaluate(() => {
        return document.body.scrollHeight;
      });
      
      const currentHeight = page.viewport()?.height || height;
      const numPages = Math.ceil(pageHeight / currentHeight);
      console.log(`[${deviceType}] Content requires approximately ${numPages} pages`);
      
      if (numPages > 1) {
        for (let i = 1; i < numPages; i++) {
          const scrollPosition = i * currentHeight;
          await page.evaluate((position) => window.scrollTo(0, position), scrollPosition);
          console.log(`[${deviceType}] Scrolling to page ${i+1} and waiting ${pageDelay} seconds...`);
          await page.evaluate((delayMs) => {
            return new Promise(resolve => setTimeout(resolve, delayMs));
          }, pageDelay * 1000);
        }
        
        await page.evaluate(() => window.scrollTo(0, 0));
      }
    }
    
    await page.pdf({
      path: deviceSpecificFilename,
      width: `${page.viewport()?.width || width}px`,
      height: `${page.viewport()?.height || height}px`,
      printBackground: true
    });

    console.log(`[${deviceType}] PDF generated as ${deviceSpecificFilename}`);
    await page.close();
  }

  await browser.close();
  console.log(`All requested PDFs have been generated.`);
}

async function main(): Promise<void> {
  let url = process.argv[2];
  let outputFilename = process.argv[3];
  let initialDelay = process.argv[4] ? parseInt(process.argv[4], 10) : undefined;
  let pageDelay = process.argv[5] ? parseInt(process.argv[5], 10) : undefined;
  let width = process.argv[6] ? parseInt(process.argv[6], 10) : undefined;
  let height = process.argv[7] ? parseInt(process.argv[7], 10) : undefined;
  let deviceTypes: string[] = [];
  let customViewport = false;
  
  if (!url) {
    try {
      const args = await promptForArgs();
      url = args.url;
      outputFilename = args.outputFilename;
      initialDelay = args.initialDelay;
      pageDelay = args.pageDelay;
      width = args.width;
      height = args.height;
      deviceTypes = args.deviceTypes;
      customViewport = args.customViewport;
    } catch (error) {
      console.error('Error during interactive prompt:', error);
      process.exit(1);
    }
  } else if (process.argv.length > 7) {
    // If command line arguments are provided for device types
    deviceTypes = process.argv.slice(8).filter(arg => 
      ['desktop', 'tablet', 'mobile'].includes(arg)
    );
    
    if (deviceTypes.length === 0) {
      deviceTypes = ['desktop']; // Default to desktop if no valid device type is provided
    }
    
    customViewport = width !== undefined && height !== undefined;
  } else {
    deviceTypes = ['desktop']; // Default to desktop
  }
  
  if (!url) {
    console.error("No URL provided. Please specify a URL to generate PDF.");
    process.exit(1);
  }
  
  if (!outputFilename) {
    outputFilename = 'landing-page';
  }
  
  // Add .pdf extension if not present
  if (!outputFilename.endsWith('.pdf')) {
    outputFilename += '.pdf';
  }
  
  try {
    await generatePDF(url, outputFilename, initialDelay, pageDelay, width, height, deviceTypes, customViewport);
  } catch (error) {
    console.error('Error generating PDF:', error);
    process.exit(1);
  }
}

main();
