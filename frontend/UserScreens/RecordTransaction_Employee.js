/* ── Set today's date ── */
document.getElementById("date-input").value = new Date()
  .toISOString()
  .split("T")[0];

const materialSelect = document.getElementById("material-select");
const quantityInput = document.getElementById("quantity-input");
const payoutAmount = document.getElementById("payout-amount");
const payoutDetail = document.getElementById("payout-detail");
const prRate = document.getElementById("pr-rate");
const prWeight = document.getElementById("pr-weight");
const prTotal = document.getElementById("pr-total");

const materialNames = {
  12: "Plastic (PET)",
  8: "Paper / Cardboard",
  25: "Metal (Aluminium)",
  6: "Glass",
  10: "Plastic (HDPE)",
};

function updatePayout() {
  const rate = parseFloat(materialSelect.value) || 0;
  const weight = parseFloat(quantityInput.value) || 0;
  const total = rate * weight;
  const matName = materialNames[materialSelect.value] || "—";

  payoutAmount.textContent = "R " + total.toFixed(2);
  prRate.textContent = rate ? "R " + rate + " / kg" : "—";
  prWeight.textContent = weight ? weight + " kg" : "— kg";
  prTotal.textContent = "R " + total.toFixed(2);

  if (rate && weight) {
    payoutDetail.textContent =
      weight + " kg × R" + rate + "/kg (" + matName + ")";
  } else {
    payoutDetail.textContent = "Select material and enter weight";
  }
}

materialSelect.addEventListener("change", updatePayout);
quantityInput.addEventListener("input", updatePayout);

/* ── Form submit ── */
document
  .getElementById("transaction-form")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    const picker = document.getElementById("picker-select");
    const material = materialSelect;
    const weight = quantityInput;

    if (
      !picker.value ||
      !material.value ||
      !weight.value ||
      parseFloat(weight.value) <= 0
    ) {
      showToast("⚠️ Please fill in all required fields.", false);
      return;
    }

    const rate = parseFloat(material.value);
    const qty = parseFloat(weight.value);
    const payout = rate * qty;
    const matName = materialNames[material.value];
    const pickerText = picker.options[picker.selectedIndex].text;

    /* Add to recent list */
    const list = document.getElementById("recent-list");
    const item = document.createElement("div");
    item.className = "history-item";
    item.style.animation = "fadeIn .3s ease";
    item.innerHTML = `
      <div class="hi-left">
        <h4>${pickerText}</h4>
        <p>${matName} · ${qty} kg</p>
      </div>
      <div class="hi-right">
        <div class="amount">R ${payout.toFixed(2)}</div>
        <div class="time">Just now</div>
      </div>`;
    list.insertBefore(item, list.firstChild);

    showToast(
      "✅ Transaction saved — R " +
        payout.toFixed(2) +
        " payout for " +
        pickerText,
    );
    resetForm();
  });

function resetForm() {
  document.getElementById("transaction-form").reset();
  document.getElementById("date-input").value = new Date()
    .toISOString()
    .split("T")[0];
  payoutAmount.textContent = "R 0.00";
  payoutDetail.textContent = "Select material and enter weight";
  prRate.textContent = "—";
  prWeight.textContent = "— kg";
  prTotal.textContent = "R 0.00";
}

function showToast(msg, success = true) {
  const t = document.getElementById("toast");
  t.style.background = success ? "#3a9e3f" : "#e53935";
  document.getElementById("toast-msg").textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3500);
}
