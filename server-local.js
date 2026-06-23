const app = require('./server.js');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✅ Servidor local rodando em http://localhost:${PORT}\n`);
});
