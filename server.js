
function saveRegistration(data) {
  const dataPath = path.join(__dirname, 'data');
  const filePath = path.join(dataPath, 'registrations.json');
  if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath);

  let existing = [];
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath);
      existing = JSON.parse(fileContent);
    } catch (err) {
      console.error("⚠️ Failed to read existing registrations, starting fresh.");
    }
  }

  existing.push(data);

  try {
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
    console.log("✅ Registration saved.");
  } catch (err) {
    console.error("❌ Error saving registration:", err);
  }
}
