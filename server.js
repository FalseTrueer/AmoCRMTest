import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const app = express();
const PORT = process.env.PORT || 3000;

// Разрешаем CORS с любого источника (в проде лучше указать домен)
app.use(cors());
app.use(express.json());

const API_DOMAIN = "https://flunderkasatka.amocrm.ru/api/v4";

// Проксируем запрос к /leads
app.get("/api/leads", async (req, res) => {
  try {
    const response = await fetch(`${API_DOMAIN}/leads?with=contacts`, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Ошибка при запросе сделок:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Проксируем запрос к /leads/:id (с задачами)
app.get("/api/leads/:id", async (req, res) => {
  try {
    const leadRes = await fetch(`${API_DOMAIN}/leads/${req.params.id}`, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
    });
    const leadData = await leadRes.json();

    // Затем отдельно запрашиваем задачи
    const taskRes = await fetch(
      `${API_DOMAIN}/tasks?entity_id=${req.params.id}&entity_type=leads`,
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      }
    );
    const taskData = await taskRes.json();

    leadData._embedded = leadData._embedded || {};
    leadData._embedded.tasks = taskData._embedded?.tasks || [];

    res.json(leadData);
  } catch (err) {
    console.error("Ошибка при получении деталей сделки:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Проксируем запрос к /contacts/:id
app.get("/api/contacts/:id", async (req, res) => {
  try {
    const response = await fetch(`${API_DOMAIN}/contacts/${req.params.id}`, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Ошибка при получении контакта:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
