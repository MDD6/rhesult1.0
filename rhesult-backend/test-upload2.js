const http = require('http');

async function run() {
  try {
    const token = '11464718d0900f4a921b396474fce4d24a1a35d2a6c21a5354873e5676237f78';
    
    // 2. Upload avatar
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const fileContent = Buffer.from('fake image content');
    
    let postData = '--' + boundary + '\r\n';
    postData += 'Content-Disposition: form-data; name="avatar_file"; filename="avatar.jpg"\r\n';
    postData += 'Content-Type: image/jpeg\r\n\r\n';
    
    const postDataBuffer = Buffer.concat([
      Buffer.from(postData, 'utf8'),
      fileContent,
      Buffer.from('\r\n--' + boundary + '--\r\n', 'utf8')
    ]);
    
    const uploadReq = http.request({
      hostname: 'localhost',
      port: 4000,
      path: '/auth/me',
      method: 'PUT',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': postDataBuffer.length,
        'Authorization': 'Bearer ' + token
      }
    }, (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        console.log('Upload response status:', res2.statusCode);
        console.log('Upload response:', data2);
      });
    });
    
    uploadReq.write(postDataBuffer);
    uploadReq.end();
  } catch (e) {
    console.error(e);
  }
}
run();
