let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];
notes.forEach((note) => console.log(`Note ID: ${note.id}, Text: ${note.text}, Category: ${note.category}`));
function searchNotes(word) {
  return notes.filter((note) => note.text.toLowerCase().includes(word.toLowerCase()));
}
function longestNote(){
    if (notes.length === 0) {
        return null;
    }
    return notes.reduce((longest, note) => note.text.length > longest.text.length ? note : longest);
}
function countByCategory() { 
    return notes.reduce((counts, note) => { counts[note.category] = (counts[note.category] || 0) + 1; 
        return counts; }, {});
    }

function getSummary() { 
    const counts = countByCategory(); 
    return `${notes.length} notes: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study.`;
 }

function isDuplicate(text) {
    const cleanText = text.trim().replace(/\s+/g, "").toLowerCase();
    return notes.some((note) => note.text.trim().replace(/\s+/g, "").toLowerCase() === cleanText);
}
function addNote(text, category) {
    if (text.length < 1 && text.length > 200) {
        console.log("Invalid note length. Note must be 1-200 characters.");
        return false;
    }
    if (isDuplicate(text)) {
        console.log("Duplicate note. Not added.");
        return false;
    }
            const validcategories = ["personal", "work", "study"];

        if (!validcategories.includes(category)) {
            console.log("Invalid category. Use personal, work, or study.");
            return false;
        }
        const newNote = {
            id: notes.length + 1,
            text: text,
            category: category
        };
            notes.push(newNote);
            console.log(`Note added: ${newNote.text}`);
            return true;
         }

console.log("Search:", searchNotes("day")); 
console.log("Longest note:", longestNote()); 
console.log("Category counts:", countByCategory()); 
console.log("Summary:", getSummary());
console.log("Duplicate:", isDuplicate("call mum")); 
console.log("Add valid note:", addNote("Practice JavaScript functions", "study")); 
console.log("Add duplicate:", addNote(" CALL MUM ", "personal")); 
console.log("Add invalid category:", addNote("Learn CSS", "random"));
