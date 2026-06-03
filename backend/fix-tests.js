const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src/tests');
let changed = 0;

files.forEach(file => {
  if (file.includes('membership-status-validation.test.ts')) return; // Explicitly tests non-active
  if (file.includes('testFactory.ts')) return; // handled manually

  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // Pattern: { data: { userId: user.id, organizationId: org.id, role: 'ADMIN' } }
  // Only match if `status` is missing in that block.
  // Note: we can use a simpler replacement for single-line creations
  newContent = newContent.replace(/data:\s*\{\s*userId([^,]*),\s*organizationId([^,]*),\s*role([^}]*)\}/g, (match, p1, p2, p3) => {
    if (match.includes('status')) return match;
    return `data: { userId${p1}, organizationId${p2}, role${p3}, status: 'ACTIVE' }`;
  });

  // For multi-line:
  // e.g. 
  //   data: {
  //     userId: user.id,
  //     organizationId: org.id,
  //     role: 'ADMIN',
  //   }
  newContent = newContent.replace(/role:\s*'([^']+)'\s*,?\s*(\n\s*)\}/g, (match, roleName, newline) => {
    return `role: '${roleName}',${newline}status: 'ACTIVE'${newline}}`;
  });

  newContent = newContent.replace(/role\s*,?\s*(\n\s*)\}/g, (match, newline) => {
    return `role,${newline}status: 'ACTIVE'${newline}}`;
  });

  // some multi-line ones use `role }` on the same line, let's catch that
  newContent = newContent.replace(/role\s*\}/g, (match) => {
    if (match.includes('roles')) return match;
    return `role, status: 'ACTIVE' }`;
  });


  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Updated', file);
    changed++;
  }
});
console.log('Total files changed:', changed);
