const fs = require('fs');
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g,'')
  .toUpperCase().replace(/['’]/g,'_').replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const items = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const palette = ['blue','green','turquoise','purple','pink','orange','yellow','red','sky','gray'];
const seen = new Set();
const out = items.map((label, i) => {
  let v = slug(label), n = 1;
  while (seen.has(v)) v = slug(label) + '_' + (++n);
  seen.add(v);
  return { value: v, label, position: i, color: palette[i % palette.length] };
});
fs.writeFileSync(process.argv[3], JSON.stringify(out));
console.log(process.argv[3].split('/').pop(), '->', out.length, 'options ; doublons de value :', out.length - new Set(out.map(o=>o.value)).size);
