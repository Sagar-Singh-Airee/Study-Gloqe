// fix-remaining-imports.cjs - Fix all remaining old import paths
const fs = require('fs');
const path = require('path');

function updateFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Fix AuthContext imports
    content = content.replace(/from ['"]@\/contexts\/AuthContext['"]/g, "from '@auth/contexts/AuthContext'");

    // Fix ClassContext imports
    content = content.replace(/from ['"]@\/contexts\/ClassContext['"]/g, "from '@classroom/contexts/ClassContext'");

    // Fix any remaining @/config/ imports
    content = content.replace(/from ['"]@\/config\/firebase['"]/g, "from '@shared/config/firebase'");
    content = content.replace(/from ['"]@\/config\/gemini['"]/g, "from '@shared/config/gemini'");

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed: ${filePath}`);
        return true;
    }

    return false;
}

function walkDirectory(dir) {
    if (!fs.existsSync(dir)) {
        return;
    }

    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            walkDirectory(filePath);
        } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx'))) {
            updateFile(filePath);
        }
    });
}

console.log('Fixing remaining import paths...\n');

walkDirectory('./src/features');
walkDirectory('./src/shared');

console.log('\nAll import paths fixed!');
