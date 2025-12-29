const fs = require('fs-extra');
const path = require('path');

const mainJsPath = path.resolve(__dirname, 'dist/main.js');

async function postbuild() {
  try {
    // Add shebang to main.js
    let mainJsContent = await fs.readFile(mainJsPath, 'utf8');
    if (!mainJsContent.startsWith('#!/usr/bin/env node')) {
      mainJsContent = '#!/usr/bin/env node\n' + mainJsContent;
      await fs.writeFile(mainJsPath, mainJsContent, 'utf8');
      console.log(`Added shebang to ${mainJsPath}`);
    } else {
      console.log(`Shebang already present in ${mainJsPath}`);
    }

    // Make main.js executable (for Unix-like systems)
    await fs.chmod(mainJsPath, '755');
    console.log(`Set executable permissions for ${mainJsPath}`);

  } catch (err) {
    console.error(`Error during postbuild: ${err}`);
    process.exit(1);
  }
}

postbuild();