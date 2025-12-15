// ultimate-fix-imports.cjs - Fix ALL imports including relative paths
const fs = require('fs');
const path = require('path');

let filesFixed = 0;

function updateFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Fix ALL variations of config imports
    content = content.replace(/from ['"](\.\.\/)+config\/firebase['"]/g, "from '@shared/config/firebase'");
    content = content.replace(/from ['"](\.\.\/)+config\/gemini['"]/g, "from '@shared/config/gemini'");

    // Fix ALL variations of context imports
    content = content.replace(/from ['"](\.\.\/)+contexts\/AuthContext['"]/g, "from '@auth/contexts/AuthContext'");
    content = content.replace(/from ['"](\.\.\/)+contexts\/ClassContext['"]/g, "from '@classroom/contexts/ClassContext'");

    // Fix ALL variations of helper/utils imports
    content = content.replace(/from ['"](\.\.\/)+helpers\/subjectDetection['"]/g, "from '@shared/utils/subjectDetection'");
    content = content.replace(/from ['"](\.\.\/)+utils\//g, "from '@shared/utils/");

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        filesFixed++;
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

console.log('ULTIMATE FIX - Fixing ALL import paths including relative...\n');

walkDirectory('./src/features');
walkDirectory('./src/shared');

console.log(`\n✅ Fixed ${filesFixed} files!`);
