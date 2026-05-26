import https from 'https';

async function testUrl(url: string) {
  console.log(`Testing URL: ${url}`);
  const start = Date.now();
  return new Promise((resolve) => {
    https.get(url, (res) => {
      console.log(`  Status: ${res.statusCode} (took ${Date.now() - start}ms)`);
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`  Size: ${body.length} bytes`);
        if (res.statusCode !== 200) {
          console.log(`  Preview: ${body.substring(0, 500)}`);
        }
        resolve(res.statusCode);
      });
    }).on('error', (err) => {
      console.log(`  Error: ${err.message}`);
      resolve(500);
    });
  });
}

async function main() {
  await testUrl('https://lannapoolclub.com/teams/11');
  await testUrl('https://lannapoolclub.com/players/3');
}

main();
