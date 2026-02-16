const fs = require('fs');
const path = require('path');

const parts = ['temp_part1.ts', 'temp_part2.ts', 'temp_part3.ts', 'temp_part4.ts'];
const outputFile = path.join(__dirname, 'src', 'services', 'aiService.ts');

let finalContent = '';

try {
  for (const part of parts) {
    const partPath = path.join(__dirname, part);
    if (fs.existsSync(partPath)) {
        console.log(`Reading ${part}...`);
        const content = fs.readFileSync(partPath, 'utf8');
        finalContent += content;
    } else {
        console.error(`Error: ${part} not found!`);
        process.exit(1);
    }
  }

  console.log(`Writing to ${outputFile}...`);
  fs.writeFileSync(outputFile, finalContent, 'utf8');
  console.log('Successfully reconstructed aiService.ts');
} catch (error) {
  console.error('Error constructing file:', error);
  process.exit(1);
}
