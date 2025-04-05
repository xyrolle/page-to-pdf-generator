import puppeteer, { PaperFormat } from 'puppeteer';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import inquirer from 'inquirer';

async function promptForArgs(): Promise<{ 
  url: string; 
  outputFilename: string; 
  initialDelay: number;
  pageDelay: number;
  width: number;
  height: number;
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
    message: 'Enter output filename:',
    default: 'landing-page.pdf',
    validate: (input: string) => {
      return input.endsWith('.pdf') 
        ? true 
        : 'Filename must end with .pdf extension';
    }
  });
  
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
  
  return {
    url: urlAnswer.url,
    outputFilename: filenameAnswer.outputFilename,
    initialDelay: initialDelayAnswer.initialDelay,
    pageDelay: pageDelayAnswer.pageDelay,
    width: widthAnswer.width,
    height: heightAnswer.height
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
  outputFilename: string = 'landing-page.pdf', 
  initialDelay: number = 0,
  pageDelay: number = 0,
  width: number = 794,
  height: number = 1123
): Promise<void> {
  const isHealthy = await checkSiteHealth(url);
  if (!isHealthy) {
    throw new Error(`Site is not available: ${url}`);
  }

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('dialog', async (dialog) => {
    console.log(`Auto-dismissing dialog: ${dialog.message()}`);
    await dialog.dismiss();
  });
  
  await page.goto(url, { waitUntil: 'networkidle0' });
  
  try {
    console.log('Attempting to close any popups by clicking on the page...');
    
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
    
    const dimensions = await page.evaluate(() => {
      return {
        width: window.innerWidth,
        height: window.innerHeight
      };
    });
    
    await page.mouse.click(dimensions.width - 50, 50);
    console.log('Clicked top-right corner to dismiss possible popups');
    
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
    
    await page.mouse.click(dimensions.width / 2, dimensions.height / 2);
    console.log('Clicked center of page to dismiss possible popups');
    
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));
    
    await page.keyboard.press('Escape');
    console.log('Pressed Escape key to dismiss possible popups');
    
  } catch (error) {
    console.log(`Error handling popups: ${error}`);
  }
  
  if (initialDelay > 0) {
    console.log(`Waiting initial ${initialDelay} seconds for page to fully load...`);
    await page.evaluate((delayMs) => {
      return new Promise(resolve => setTimeout(resolve, delayMs));
    }, initialDelay * 1000);
  }

  if (pageDelay > 0) {
    console.log(`Using ${pageDelay} second delay between pages for multi-page content`);
    
    const pageHeight = await page.evaluate(() => {
      return document.body.scrollHeight;
    });
    
    await page.setViewport({ width, height });
    
    const numPages = Math.ceil(pageHeight / height);
    console.log(`Content requires approximately ${numPages} pages`);
    
    if (numPages > 1) {
      for (let i = 1; i < numPages; i++) {
        const scrollPosition = i * height;
        await page.evaluate((position) => window.scrollTo(0, position), scrollPosition);
        console.log(`Scrolling to page ${i+1} and waiting ${pageDelay} seconds...`);
        await page.evaluate((delayMs) => {
          return new Promise(resolve => setTimeout(resolve, delayMs));
        }, pageDelay * 1000);
      }
      
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    
    await page.pdf({
      path: outputFilename,
      width: `${width}px`,
      height: `${height}px`,
      printBackground: true
    });
  } else {
    await page.pdf({
      path: outputFilename,
      width: `${width}px`,
      height: `${height}px`,
      printBackground: true
    });
  }

  await browser.close();
  console.log(`PDF generated as ${outputFilename}`);
}

async function main(): Promise<void> {
  let url = process.argv[2];
  let outputFilename = process.argv[3];
  let initialDelay = process.argv[4] ? parseInt(process.argv[4], 10) : undefined;
  let pageDelay = process.argv[5] ? parseInt(process.argv[5], 10) : undefined;
  let width = process.argv[6] ? parseInt(process.argv[6], 10) : undefined;
  let height = process.argv[7] ? parseInt(process.argv[7], 10) : undefined;
  
  if (!url) {
    try {
      const args = await promptForArgs();
      url = args.url;
      outputFilename = args.outputFilename;
      initialDelay = args.initialDelay;
      pageDelay = args.pageDelay;
      width = args.width;
      height = args.height;
    } catch (error) {
      console.error('Error during interactive prompt:', error);
      process.exit(1);
    }
  }
  
  if (!url) {
    console.error("No URL provided. Please specify a URL to generate PDF.");
    process.exit(1);
  }
  
  try {
    await generatePDF(url, outputFilename, initialDelay, pageDelay, width, height);
  } catch (error) {
    console.error('Error generating PDF:', error);
    process.exit(1);
  }
}

main();
