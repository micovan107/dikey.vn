import fs from "fs";
import fetch from "node-fetch";

const FIREBASE_URL = "https://<tên-database>.firebaseio.com/posts.json";
const OUTPUT_DIR = "./generated";

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

  const res = await fetch(FIREBASE_URL);
  const data = await res.json();

  Object.entries(data || {}).forEach(([id, post]) => {
    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${post.title}</title>
  <meta name="description" content="${post.content.slice(0,150)}">
  <meta property="og:title" content="${post.title}">
  <meta property="og:description" content="${post.content.slice(0,150)}">
  <link rel="canonical" href="https://<username>.github.io/dikey.vn/generated/post-${id}.html">
</head>
<body>
  <h1>${post.title}</h1>
  <div>${post.content}</div>
  <a href="../index.html">← Quay lại</a>
</body>
</html>
`;
    fs.writeFileSync(`${OUTPUT_DIR}/post-${id}.html`, html);
    console.log(`Tạo file: post-${id}.html`);
  });
}

main();
