const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const fs = require('fs');

const app = express();
const PORT = 3000;


app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({ secret: 'secret_key', resave: false, saveUninitialized: true }));
app.use(express.static('public'));


const loadDatabase = () => JSON.parse(fs.readFileSync('database.json', 'utf8'));
const saveDatabase = (data) => fs.writeFileSync('database.json', JSON.stringify(data, null, 2));

function authMiddleware(req, res, next) {
  if (!req.session.user) return res.redirect('/');
  next();
}


app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/chat');
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  const db = loadDatabase();

  if (db.users.some((user) => user.email === email)) {
    return res.send('<script>alert("E-mail já registrado!"); window.location="/";</script>');
  }

  db.users.push({ id: db.users.length + 1, name, email, password });
  saveDatabase(db);
  res.send('<script>alert("Cadastro realizado com sucesso! Faça login."); window.location="/";</script>');
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const db = loadDatabase();

  const user = db.users.find((user) => user.email === email && user.password === password);
  if (!user) {
    return res.send('<script>alert("Credenciais inválidas!"); window.location="/";</script>');
  }

  req.session.user = user;
  res.redirect('/chat');
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/chat', authMiddleware, (req, res) => {
  const db = loadDatabase();
  const messages = db.messages
    .map((msg) => `<p><strong>${msg.sender}:</strong> ${msg.content}</p>`)
    .join('');

  // Obter todos os usuários cadastrados (exceto o usuário logado)
  const users = db.users.filter((user) => user.id !== req.session.user.id);
  
  // Gerar a lista de usuários para o select
  const userOptions = users.map(
    (user) => `<option value="${user.id}">${user.name}</option>`
  ).join('');

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Chat - Sala de Bate-Papo</title>
      <link rel="stylesheet" href="/styles.css">
    </head>
    <body>
      <div class="container">
        <h1>Bem-vindo, ${req.session.user.name}!</h1>
        <div class="chat-box">
          ${messages || '<p class="no-messages">Nenhuma mensagem no momento.</p>'}
        </div>

        <!-- Formulário para enviar mensagem -->
        <form action="/send" method="POST" class="form">
          <label for="sender">Escolha o remetente:</label>
          <select name="sender" id="sender">
            <option value="${req.session.user.id}">${req.session.user.name} (Você)</option>
            ${userOptions}
          </select>
          
          <input type="text" name="content" placeholder="Digite sua mensagem" required>
          <button type="submit">Enviar</button>
        </form>

        <a href="/logout" class="logout-btn">Sair</a>
      </div>
    </body>
    </html>
  `);
});



app.post('/send', authMiddleware, (req, res) => {
  const { sender, content } = req.body;
  const db = loadDatabase();

  const senderUser = db.users.find((user) => user.id == sender);

  if (!senderUser) {
    return res.send('<script>alert("Usuário inválido!"); window.location="/chat";</script>');
  }

  db.messages.push({
    sender: senderUser.name,
    content,
  });

  saveDatabase(db);
  res.redirect('/chat');
});


// Iniciar o servidor
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
