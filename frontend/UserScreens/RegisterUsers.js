
//This shows the messages after registering
function showToast(msg, success = true) {
  const t = document.getElementById("toast");
  t.style.background = success ? "#3a9e3f" : "#e53935";
  document.getElementById("toast-msg").textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3500);
}
//Registers pickers
function registerPicker() {
  const fname = document.getElementById("fname").value.trim();
  const lname = document.getElementById("lname").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const zone = document.getElementById("zone").value;

  if (!fname || !lname || !phone || !zone) {
    showToast("Please fill in all required fields.", false);
    return;
  }

  // Saves the pickers to the local storage
  const pickers = JSON.parse(localStorage.getItem("ecocycle_pickers") || "[]");
  const picker = {
    id: "EC-" + String(pickers.length + 1).padStart(4, "0"),
    name: fname + " " + lname,
    phone,
    zone: document.getElementById("zone").value,
    material: document.getElementById("material").value || "Mixed",
    address: document.getElementById("address").value,
    payment: document.getElementById("payment").value,
    notes: document.getElementById("notes").value,
    gender: document.getElementById("gender").value,
    idnum: document.getElementById("idnum").value,
    dob: document.getElementById("dob").value,
    bankaccount: document.getElementById("bankaccount").value,
    joined: new Date().toLocaleDateString("en-ZA"),
    kg: 0,
    transactions: 0,
    earnings: 0,
  };
  pickers.push(picker);
  localStorage.setItem("ecocycle_pickers", JSON.stringify(pickers));

  showToast("✅ " + picker.name + " registered successfully!");
  clearForm();
}

//Clears the form after input
function clearForm() {
  [
    "fname",
    "lname",
    "idnum",
    "phone",
    "address",
    "notes",
    "bankaccount",
    "dob",
  ].forEach((id) => {
    document.getElementById(id).value = "";
  });
  ["gender", "zone", "material", "payment"].forEach((id) => {
    document.getElementById(id).value = "";
  });
}

//This shows the messages after registering
function showToast(msg, success = true) {
  const t = document.getElementById("toast");
  t.style.background = success ? "#3a9e3f" : "#e53935";
  document.getElementById("toast-msg").textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3500);
}
//Registers pickers
function registerPicker() {
  const fname = document.getElementById("fname").value.trim();
  const lname = document.getElementById("lname").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const zone = document.getElementById("zone").value;

  if (!fname || !lname || !phone || !zone) {
    showToast("Please fill in all required fields.", false);
    return;
  }

  // Saves the pickers to the local storage
  const pickers = JSON.parse(localStorage.getItem("ecocycle_pickers") || "[]");
  const picker = {
    id: "EC-" + String(pickers.length + 1).padStart(4, "0"),
    name: fname + " " + lname,
    phone,
    zone: document.getElementById("zone").value,
    material: document.getElementById("material").value || "Mixed",
    address: document.getElementById("address").value,
    payment: document.getElementById("payment").value,
    notes: document.getElementById("notes").value,
    gender: document.getElementById("gender").value,
    idnum: document.getElementById("idnum").value,
    dob: document.getElementById("dob").value,
    bankaccount: document.getElementById("bankaccount").value,
    joined: new Date().toLocaleDateString("en-ZA"),
    kg: 0,
    transactions: 0,
    earnings: 0,
  };
  pickers.push(picker);
  localStorage.setItem("ecocycle_pickers", JSON.stringify(pickers));

  showToast("✅ " + picker.name + " registered successfully!");
  clearForm();
}

//Clears the form after input
function clearForm() {
  [
    "fname",
    "lname",
    "idnum",
    "phone",
    "address",
    "notes",
    "bankaccount",
    "dob",
  ].forEach((id) => {
    document.getElementById(id).value = "";
  });
  ["gender", "zone", "material", "payment"].forEach((id) => {
    document.getElementById(id).value = "";
  });
}
