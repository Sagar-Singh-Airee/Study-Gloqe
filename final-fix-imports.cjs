// final-fix-imports.cjs - Fix remaining relative and alias imports
const fs = require('fs');
const path = require('path');

let filesFixed = 0;

function updateFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Fix relative context imports in analytics
    if (filePath.includes('analytics')) {
        content = content.replace(/from ['"](\.\.\/)+contexts\/AuthContext['"]/g, "from '@auth/contexts/AuthContext'");
    }

    // Fix @components/settings imports
    content = content.replace(/from ['"]@components\/settings\//g, "from '@student/components/settings/");

    // Fix any remaining @components/features
    content = content.replace(/from ['"]@components\/features\//g, "from '@student/components/dashboard/");

    // Fix any @components/common
    content = content.replace(/from ['"]@components\/common\//g, "from '@shared/components/");

    // Fix absolute @components paths (these should already be handled, but just in case)
    content = content.replace(/from ['"]@components\//g, "from '@shared/components/");

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

console.log('Fixing final import path issues...\n');

walkDirectory('./src/features');
walkDirectory('./src/shared');

console.log(`\n✅ Fixed ${filesFixed} files!`);
