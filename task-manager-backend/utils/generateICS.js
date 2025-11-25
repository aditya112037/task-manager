const generateICS = (task) => {
  const start = new Date(task.date);
  const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 mins event

  const format = (date) =>
    date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  return `
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${task.title}
DESCRIPTION:${task.description || "Task Reminder"}
DTSTART:${format(start)}
DTEND:${format(end)}
BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
END:VEVENT
END:VCALENDAR
  `;
};

module.exports = generateICS;
