// Адрес для API-запросов через прокси-сервер
const API_DOMAIN = "http://localhost:3000/api";

// Ссылка на таблицу, куда рендерим сделки
const tableBody = document.querySelector(".deals-table-body");

// ID текущей раскрытой строки — нужен для сворачивания предыдущей
let expandedRowId = null;

// Задержка для запросов (не более 2/сек)
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Выбор цвета задачи
function getTaskStatusColor(task) {
  if (!task) return "red"; // Нет задачи

  const taskDate = new Date(task.complete_till * 1000);
  const today = new Date();

  const diffInDays = Math.floor((taskDate - today) / (1000 * 60 * 60 * 24));

  if (diffInDays < 0) return "red"; // Просрочена
  if (diffInDays === 0) return "green"; // Сегодня
  return "yellow"; // Будущая
}

// Генерация строки в таблице по сделке и контакту
function createRow(deal, contact) {
  const row = document.createElement("tr");
  row.classList.add("deal-row");
  row.dataset.id = deal.id;

  // Извлекаем номер телефона из кастомных полей контакта
  const phone =
    contact?.custom_fields_values?.find((f) => f.field_code === "PHONE")
      ?.values?.[0]?.value || "—";

  // Заполняем строку таблицы
  row.innerHTML = `
    <td>${deal.id}</td>
    <td><button class="deal-name border border-3 rounded-3">${
      deal.name
    }</button></td>
    <td>${deal.price}</td>
    <td>${contact?.name || "—"}</td>
    <td>${phone}</td>
  `;

  // При клике по названию сделки — загружаем доп. данные
  row
    .querySelector(".deal-name")
    .addEventListener("click", () => toggleExpand(row, deal.id));

  tableBody.appendChild(row);
}

// Разворачивание строки со сделкой (показ задач и деталей)
async function toggleExpand(row, dealId) {
  // Если уже открыта — закрываем
  if (expandedRowId === dealId) {
    const existing = document.querySelector("tr.details-row");
    if (existing) existing.remove();
    expandedRowId = null;
    return;
  }

  // Закрыть другую открытую строку, если есть
  const existing = document.querySelector("tr.details-row");
  if (existing) existing.remove();

  // Показать спиннер
  const loadingRow = document.createElement("tr");
  loadingRow.className = "details-row";
  loadingRow.innerHTML = `<td colspan="5" class="text-center">Загрузка...</td>`;
  row.insertAdjacentElement("afterend", loadingRow);

  // Запрос деталей по сделке (включая задачи)
  const detailRes = await fetch(`${API_DOMAIN}/leads/${dealId}`);
  const detailData = await detailRes.json();

  // Выбираем первую задачу, которая действительно относится к этой сделке
  const allTasks = detailData._embedded?.tasks || [];
  const task = allTasks.find((t) => t.entity_id === detailData.id);
  const taskColor = getTaskStatusColor(task);

  const dateStr = new Date(detailData.created_at * 1000).toLocaleDateString(
    "ru-RU"
  );

  // Отрисовка раскрытой строки с деталями
  loadingRow.innerHTML = `
      <td colspan="5">
        <div class="d-flex align-items-start gap-2 flex-column">
          <span><strong>Название:</strong> ${detailData.name}</span> 
          <span><strong>ID:</strong> ${detailData.id}</span> 
          <span><strong>Дата создания:</strong> ${dateStr}</span> 
          <span><strong>Задача:</strong> ${task?.text || "Нет задачи"}</span> 
          <span>
            <strong>Статус задачи:</strong>
            <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
              <circle cx="6" cy="6" r="5" fill="${taskColor}" stroke="#444" stroke-width="1" />
            </svg>
          </span> 
        </div>
      </td>
    `;

  expandedRowId = dealId;
}

// Основная функция — загружает сделки и связанные с ними контакты
async function loadDeals() {
  const dealsRes = await fetch(`${API_DOMAIN}/leads`);
  const dealsData = await dealsRes.json();
  const deals = dealsData._embedded?.leads || [];

  for (let i = 0; i < deals.length; i++) {
    const deal = deals[i];
    const contact = deal._embedded?.contacts?.[0];

    // Подгружаем карточку контакта по ID (для телефона и имени)
    if (contact) {
      const contactRes = await fetch(`${API_DOMAIN}/contacts/${contact.id}`);
      const contactData = await contactRes.json();
      createRow(deal, contactData);
    } else {
      createRow(deal, null);
    }

    // Задержка между запросами, чтобы не нарушить лимит API
    await delay(500);
  }
}

loadDeals();
