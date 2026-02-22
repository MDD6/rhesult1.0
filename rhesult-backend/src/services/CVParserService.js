const fs = require('fs');
const pdf = require('pdf-parse');

async function parseCV(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    const text = data.text;

    // --- Heuristic Extraction "AI-Lite" ---
    // In a real production environment with API keys, you would send 'text' to OpenAI/Gemini here.
    // For now, we use advanced Regex patterns to simulate the extraction.

    // 1. Email Extraction
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
    const emailMatch = text.match(emailRegex);
    const email = emailMatch ? emailMatch[0] : '';

    // 2. Phone Extraction (Brazilian Format Support)
    // Matches: (11) 99999-9999, 11 999999999, +55 11 ...
    const phoneRegex = /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}[-\s]?\d{4}|\d{4}[-\s]?\d{4})/;
    const phoneMatch = text.match(phoneRegex);
    const telefone = phoneMatch ? phoneMatch[0].replace(/\D/g, '') : '';

    // 3. Name Extraction (Heuristic: First non-empty line that isn't a label)
    // This is the hardest part without Real AI. We look for the first capitalized line.
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
    let nome = '';
    const ignoreList = ['curriculum', 'vitae', 'cv', 'resumo', 'objetivo', 'dados', 'pessoais', 'contato'];
    
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (!ignoreList.some(ign => lower.includes(ign)) && !lower.includes('@')) {
         // Check if it looks like a name (mostly letters, no numbers)
         if (/^[a-zA-ZÀ-ÿ\s]+$/.test(line)) {
            nome = line;
            break;
         }
      }
    }

    // 4. LinkedIn
    const linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9-]+/;
    const linkedinMatch = text.match(linkedinRegex);
    const linkedin = linkedinMatch ? `https://www.${linkedinMatch[0]}` : '';

    // 5. Seniority Detection (Keyword Search)
    const lowerText = text.toLowerCase();
    let senioridade = 'Junior'; // Default
    if (lowerText.includes('senior') || lowerText.includes('sênior') || lowerText.includes('lead') || lowerText.includes('especialista')) {
        senioridade = 'Senior';
    } else if (lowerText.includes('pleno') || lowerText.includes('mid-level')) {
        senioridade = 'Pleno';
    } else if (lowerText.includes('estagiario') || lowerText.includes('estagiário') || lowerText.includes('intern')) {
        senioridade = 'Estagiario';
    }
    
    // 6. Role/Cargo (Look for common IT roles)
    let cargo_desejado = '';
    const roles = ['desenvolvedor', 'developer', 'engenheiro de software', 'software engineer', 'analista de sistemas', 'frontend', 'backend', 'fullstack', 'qa', 'tester', 'product owner', 'scrum master', 'designer'];
    for (const role of roles) {
        if (lowerText.includes(role)) {
            cargo_desejado = role.charAt(0).toUpperCase() + role.slice(1);
            break; // Take the first match
        }
    }

    return {
      nome: nome.substring(0, 100),
      email: email,
      telefone: telefone,
      senioridade: senioridade,
      cargo_desejado: cargo_desejado,
      linkedin: linkedin,
      historico: text.substring(0, 500) // First 500 chars as summary/history
    };

  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Falha ao ler o arquivo PDF.');
  }
}

module.exports = { parseCV };
