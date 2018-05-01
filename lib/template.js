module.exports = data => `<h3 align="center">${data.body}</h3>
<p align="center">Collaborator added: <strong>${data.owner}</strong></p>

---

${data.ccList ? `<h6 align="center">/cc ${data.ccList}</h6>` : ''}`