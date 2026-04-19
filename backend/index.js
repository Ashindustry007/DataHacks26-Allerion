const express = require('express');
const cors = require('cors');
const path = require('path'); // I need this to create a correct path to the static files
const app = express();
const port = 3000;

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../frontend/dist')))

app.use(cors());
app.use(express.json());

app.get('/forecast', (req, res) => {
  res.json({
    advisories: ["High pollen levels expected tomorrow. Take precautions."],
    daily: [
      { date: "2024-05-20", composite_index: 4, severity: "High", species: [{ name: "Oak", pollen_index: 3, current_stage: "Flowering", confidence: 0.8 }, { name: "Ragweed", pollen_index: 4, current_stage: "Flowering", confidence: 0.9 }] },
      { date: "2024-05-21", composite_index: 3, severity: "Moderate", species: [{ name: "Oak", pollen_index: 2, current_stage: "Flowering", confidence: 0.8 }, { name: "Ragweed", pollen_index: 3, current_stage: "Flowering", confidence: 0.9 }] },
    ],
  });
});

app.get('/pollen_count', (req, res) => {
    res.json([
        { h3_index: "89283082807ffff", pollen_index: 5 },
        { h3_index: "89283082817ffff", pollen_index: 7 },
    ]);
});

app.post('/upload_photo', (req, res) => {
    res.json({
        species: "Birch",
        confidence: 0.95
    });
});

// Anything that doesn't match the above, send back index.html
app.get('*' , (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
})

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
});
