// super-final-fix.cjs - Fix the last remaining issues
const fs = require('fs');
const path = require('path');

function updateFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Fix PDFUpload dynamic import
    content = content.replace(/await import\(['"]@\/config\/firebase['"]\)/g, "await import('@shared/config/firebase')");

    // Fix LeaderboardSection imports - it's in analytics, not student    
    content = content.replace(/from ['"]@student\/components\/dashboard\/LeaderboardSection['"]/g, "from '@analytics/components/LeaderboardSection'");

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

console.log('Final fix - resolving last import issues...\n');

walkDirectory('./src/features');

console.log('\n✅ All done!');
