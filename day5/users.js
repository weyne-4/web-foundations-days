const status = document.getElementById("status");
const loadBtn = document.getElementById("load-users");
const filterInput = document.getElementById("filter-input");
const userList = document.getElementById("users-list");

let users = [ ];

async function loadUsers() {
    loadBtn.disabled= true;
    status.textContent= "Loading Users...";
    usersList.replaceChildren();

    try{
        const responce = await fetch(API_URL);

        if(!Response.ok){
            throw new Error ('Resquest faled with status ${response.status}');

        }
        const data = await Response.json();

        if(!Array.isArray(data)){
            throw new Error("The API returned an unexpected response.");
        }
        users = data;
        filterInput.value = "";
        renderUsers(users);

        status.textContent = 'Successfully loaded ${users.lenght} users.'
    }catch (error){
        users = [];
        usersList.replaceChildren();

        status.textContent = 'Error loading users: ${error.message}';
    }finally{
        losdBtn.disabled = false;
    }  
}
function renderUsers(list) {
usersList.replaceChildren();

if (list.length === 0) {
    status.textContent = "No users match your filter.";
    return;
}

list.forEach((user) => {
    const listItem = document.createElement("li");
    const name = document.createElement("h3");
    const email = document.createElement("p");
    const city = document.createElement("p");
    const company = document.createElement("p");

    name.textContent = user.name;
    email.textContent = `Email: ${user.email}`;
    city.textContent = `City: ${user.address.city}`;
    company.textContent = `Company: ${user.company.name}`;

    listItem.append(name, email, city, company);
    usersList.appendChild(listItem);
});

}

loadBtn.addEventListener("click", loadUsers);

filterInput.addEventListener("input", () => {
const searchText = filterInput.value.trim().toLowerCase();

const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchText)
);

renderUsers(filteredUsers);

if (filteredUsers.length === 0) {
    status.textContent = "No users match your filter.";
} else {
    status.textContent =
        `Showing ${filteredUsers.length} of ${users.length} users.`;
}

});

