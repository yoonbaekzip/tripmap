const categoryColors = {
  food: "#ef4444",
  cafe: "#a16207",
  tour: "#16a34a",
  shopping: "#9333ea",
  hotel: "#2563eb",
  transport: "#0891b2",
  etc: "#6b7280"
};

const categoryNames = {
  food: "맛집",
  cafe: "카페",
  tour: "관광지",
  shopping: "쇼핑",
  hotel: "숙소",
  transport: "교통",
  etc: "기타"
};

let trips = JSON.parse(localStorage.getItem("travelTripsV4")) || [];
let currentTripId = localStorage.getItem("currentTripIdV4") || null;
let markers = [];
let map;

function saveTrips() {
  localStorage.setItem("travelTripsV4", JSON.stringify(trips));
  localStorage.setItem("currentTripIdV4", currentTripId || "");
}

function getCurrentTrip() {
  return trips.find(trip => String(trip.id) === String(currentTripId));
}

function sortedTrips() {
  return [...trips].sort((a, b) => {
    if (a.startDate !== b.startDate) {
      return b.startDate.localeCompare(a.startDate);
    }

    return b.id - a.id;
  });
}

function openNewTripModal() {
  closeAllTripMenus();
  document.getElementById("newTripModal").classList.add("active");
}

function closeNewTripModal() {
  document.getElementById("newTripModal").classList.remove("active");
}

function addTrip() {
  const name = document.getElementById("tripName").value.trim();
  const startDate = document.getElementById("tripStartDate").value;
  const endDate = document.getElementById("tripEndDate").value;

  if (!name || !startDate || !endDate) {
    alert("계획 이름, 시작일, 종료일을 입력해줘.");
    return;
  }

  if (startDate > endDate) {
    alert("시작일이 종료일보다 늦을 수 없어.");
    return;
  }

  const trip = {
    id: Date.now(),
    name,
    startDate,
    endDate,
    createdAt: new Date().toISOString(),
    places: []
  };

  trips.push(trip);
  currentTripId = trip.id;

  document.getElementById("tripName").value = "";
  document.getElementById("tripStartDate").value = "";
  document.getElementById("tripEndDate").value = "";

  closeNewTripModal();
  saveTrips();
  renderHome();
  openTrip(trip.id);
}

function renderHome() {
  const tripList = document.getElementById("tripList");
  tripList.innerHTML = "";

  const list = sortedTrips();

  if (list.length === 0) {
    tripList.innerHTML = `
      <div class="empty">
        아직 여행 계획이 없어.<br>
        + New Trip 버튼으로 새 여행을 만들어줘.
      </div>
    `;
    return;
  }

  list.forEach(trip => {
    const totalCost = trip.places.reduce((sum, place) => sum + Number(place.cost || 0), 0);

    const card = document.createElement("div");
    card.className = "trip-card";
    card.onclick = () => openTrip(trip.id);

    card.innerHTML = `
      <div class="trip-header">
        <div>
          <h3>${trip.name}</h3>
          <div class="small">
            기간: ${trip.startDate} ~ ${trip.endDate}<br>
            저장된 장소: ${trip.places.length}곳<br>
            예상 경비: ${totalCost.toLocaleString()}엔
          </div>
        </div>

        <button
          class="trip-menu-btn"
          onclick="event.stopPropagation(); toggleTripMenu(${trip.id})">
          ⋮
        </button>
      </div>

      <div id="tripMenu-${trip.id}" class="trip-menu">
        <button
          class="delete-option"
          onclick="event.stopPropagation(); deleteTripFromHome(${trip.id})">
          🗑️ 삭제
        </button>
      </div>
    `;

    tripList.appendChild(card);
  });
}

function toggleTripMenu(id) {
  const targetMenu = document.getElementById(`tripMenu-${id}`);

  if (!targetMenu) return;

  const isActive = targetMenu.classList.contains("active");

  closeAllTripMenus();

  if (!isActive) {
    targetMenu.classList.add("active");
  }
}

function closeAllTripMenus() {
  document.querySelectorAll(".trip-menu").forEach(menu => {
    menu.classList.remove("active");
  });
}

function deleteTripFromHome(id) {
  const trip = trips.find(item => String(item.id) === String(id));

  if (!trip) return;

  if (!confirm(`'${trip.name}' 여행을 삭제할까?\n저장된 장소도 모두 삭제돼.`)) {
    closeAllTripMenus();
    return;
  }

  trips = trips.filter(item => String(item.id) !== String(id));

  if (String(currentTripId) === String(id)) {
    currentTripId = null;
  }

  saveTrips();
  closeAllTripMenus();
  renderHome();
}

function openTrip(id) {
  closeAllTripMenus();

  currentTripId = id;
  saveTrips();

  document.getElementById("homeScreen").classList.remove("active");
  document.getElementById("detailScreen").classList.add("active");
  document.getElementById("backBtn").style.display = "inline-block";

  const trip = getCurrentTrip();
  document.getElementById("headerTitle").textContent = trip ? trip.name : "Travel Planner";

  initMapIfNeeded();

  setTimeout(() => {
    map.invalidateSize();
    renderCurrentTripInfo();
    renderPlaces();
  }, 100);
}

function goHome() {
  document.getElementById("detailScreen").classList.remove("active");
  document.getElementById("homeScreen").classList.add("active");
  document.getElementById("backBtn").style.display = "none";
  document.getElementById("headerTitle").textContent = "Travel Planner";

  renderHome();
}

function renderCurrentTripInfo() {
  const box = document.getElementById("currentTripInfo");
  const trip = getCurrentTrip();

  if (!trip) {
    box.innerHTML = "선택된 여행이 없어.";
    return;
  }

  box.innerHTML = `
    <b>${trip.name}</b><br>
    기간: ${trip.startDate} ~ ${trip.endDate}<br>
    저장된 장소: ${trip.places.length}곳
  `;
}

function initMapIfNeeded() {
  if (map) return;

  map = L.map("map").setView([34.6937, 135.5023], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  map.on("click", function(e) {
    document.getElementById("lat").value = e.latlng.lat.toFixed(6);
    document.getElementById("lng").value = e.latlng.lng.toFixed(6);
  });
}

function clearMarkers() {
  if (!map) return;

  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
}

function createHourMinuteOptions() {
  const hourList = document.getElementById("hourList");
  const minuteList = document.getElementById("minuteList");

  for (let i = 0; i < 24; i++) {
    const option = document.createElement("option");
    option.value = String(i).padStart(2, "0");
    hourList.appendChild(option);
  }

  for (let i = 0; i < 60; i += 10) {
    const option = document.createElement("option");
    option.value = String(i).padStart(2, "0");
    minuteList.appendChild(option);
  }
}

function getMarkerIcon(category) {
  const color = categoryColors[category] || "#6b7280";

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background:${color};
        width:24px;
        height:24px;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:2px solid white;
        box-shadow:0 2px 5px rgba(0,0,0,0.35);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24]
  });
}

async function searchPlace() {
  const keyword = document.getElementById("searchKeyword").value.trim();

  if (!keyword) {
    alert("검색어를 입력해줘.");
    return;
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(keyword)}&limit=1`;

  try {
    const response = await fetch(url, {
      headers: { "Accept": "application/json" }
    });

    const data = await response.json();

    if (!data.length) {
      alert("검색 결과가 없어. 장소명을 조금 더 자세히 입력해봐.");
      return;
    }

    const result = data[0];

    document.getElementById("placeName").value = result.display_name.split(",")[0];
    document.getElementById("lat").value = Number(result.lat).toFixed(6);
    document.getElementById("lng").value = Number(result.lon).toFixed(6);

    map.setView([result.lat, result.lon], 16);
  } catch (error) {
    alert("검색에 실패했어. 위도와 경도를 직접 입력해줘.");
  }
}

function addPlace() {
  const trip = getCurrentTrip();

  if (!trip) {
    alert("먼저 여행 계획을 선택해줘.");
    return;
  }

  const name = document.getElementById("placeName").value.trim();
  const category = document.getElementById("category").value;
  const date = document.getElementById("date").value;
  const hourInput = document.getElementById("hour").value.trim();
  const minuteInput = document.getElementById("minute").value.trim();
  const lat = parseFloat(document.getElementById("lat").value);
  const lng = parseFloat(document.getElementById("lng").value);
  const cost = Number(document.getElementById("cost").value || 0);
  const memo = document.getElementById("memo").value.trim();

  if (!name || !date || isNaN(lat) || isNaN(lng)) {
    alert("장소 이름, 날짜, 위도, 경도는 꼭 입력해야 해.");
    return;
  }

  if (date < trip.startDate || date > trip.endDate) {
    if (!confirm("선택한 날짜가 여행 기간 밖이야. 그래도 추가할까?")) {
      return;
    }
  }

  const hour = hourInput ? hourInput.padStart(2, "0") : "00";
  const minute = minuteInput ? minuteInput.padStart(2, "0") : "00";

  const place = {
    id: Date.now(),
    name,
    category,
    date,
    time: `${hour}:${minute}`,
    lat,
    lng,
    cost,
    memo,
    rating: ""
  };

  trip.places.push(place);

  saveTrips();
  clearPlaceForm();
  renderCurrentTripInfo();
  renderPlaces();

  map.setView([lat, lng], 15);
}

function clearPlaceForm() {
  document.getElementById("placeName").value = "";
  document.getElementById("searchKeyword").value = "";
  document.getElementById("lat").value = "";
  document.getElementById("lng").value = "";
  document.getElementById("cost").value = "";
  document.getElementById("memo").value = "";
}

function getFilteredPlaces() {
  const trip = getCurrentTrip();

  if (!trip) return [];

  const filterDate = document.getElementById("filterDate").value;
  const filterCategory = document.getElementById("filterCategory").value;

  let filtered = [...trip.places];

  if (filterDate) {
    filtered = filtered.filter(place => place.date === filterDate);
  }

  if (filterCategory !== "all") {
    filtered = filtered.filter(place => place.category === filterCategory);
  }

  filtered.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });

  return filtered;
}

function renderSummary(filtered) {
  const summaryBox = document.getElementById("summaryBox");
  const trip = getCurrentTrip();

  if (!trip) {
    summaryBox.innerHTML = "여행을 선택해줘.";
    return;
  }

  const totalPlaces = filtered.length;
  const totalCost = filtered.reduce((sum, place) => sum + Number(place.cost || 0), 0);

  const categoryCount = {};

  filtered.forEach(place => {
    categoryCount[place.category] = (categoryCount[place.category] || 0) + 1;
  });

  const categoryText = Object.keys(categoryCount)
    .map(key => `${categoryNames[key]} ${categoryCount[key]}곳`)
    .join(" · ");

  summaryBox.innerHTML = `
    <b>일정 요약</b><br>
    표시된 장소: ${totalPlaces}곳<br>
    예상 경비: ${totalCost.toLocaleString()}엔<br>
    ${categoryText || "카테고리 없음"}
  `;
}

function renderPlaces() {
  const list = document.getElementById("placeList");
  list.innerHTML = "";

  clearMarkers();

  const filtered = getFilteredPlaces();

  renderSummary(filtered);

  filtered.forEach(place => {
    const marker = L.marker([place.lat, place.lng], {
      icon: getMarkerIcon(place.category)
    })
      .addTo(map)
      .bindPopup(`
        <b>${place.name}</b><br>
        ${place.date} ${place.time}<br>
        ${categoryNames[place.category]}<br>
        예상 경비: ${Number(place.cost || 0).toLocaleString()}엔<br>
        추천: ${place.rating || "아직 없음"}
      `);

    markers.push(marker);

    const card = document.createElement("div");
    card.className = "place-card";
    card.style.borderLeftColor = categoryColors[place.category];

    card.innerHTML = `
      <h3>${place.time} - ${place.name}</h3>

      <div class="small">
        ${place.date} / ${categoryNames[place.category]}<br>
        예상 경비: ${Number(place.cost || 0).toLocaleString()}엔<br>
        추천: ${place.rating || "아직 없음"}<br>
        메모: ${place.memo || "없음"}
      </div>

      <span class="badge">${categoryNames[place.category]}</span>

      <div class="actions">
        <button
          class="icon-btn ${place.rating === '👍' ? 'active-like' : ''}"
          onclick="event.stopPropagation(); ratePlace(${place.id}, '👍')">
          👍
        </button>

        <button
          class="icon-btn ${place.rating === '👎' ? 'active-dislike' : ''}"
          onclick="event.stopPropagation(); ratePlace(${place.id}, '👎')">
          👎
        </button>

        <button
          class="route"
          onclick="event.stopPropagation(); openGoogleMap(${place.lat}, ${place.lng})">
          🧭
        </button>

        <button
          class="danger"
          onclick="event.stopPropagation(); deletePlace(${place.id})">
          🗑️
        </button>
      </div>
    `;

    card.onclick = () => {
      map.setView([place.lat, place.lng], 16);
      marker.openPopup();
    };

    list.appendChild(card);
  });

  if (filtered.length > 0) {
    const bounds = filtered.map(place => [place.lat, place.lng]);
    map.fitBounds(bounds, { padding: [40, 40] });
  }
}

function ratePlace(id, rating) {
  const trip = getCurrentTrip();

  if (!trip) return;

  trip.places = trip.places.map(place => {
    if (place.id !== id) return place;

    return {
      ...place,
      rating: place.rating === rating ? "" : rating
    };
  });

  saveTrips();
  renderPlaces();
}

function deletePlace(id) {
  const trip = getCurrentTrip();

  if (!trip) return;

  if (!confirm("이 장소를 삭제할까?")) return;

  trip.places = trip.places.filter(place => place.id !== id);

  saveTrips();
  renderCurrentTripInfo();
  renderPlaces();
}

function openGoogleMap(lat, lng) {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
}

function exportData() {
  const dataStr = JSON.stringify({
    version: 4,
    trips
  }, null, 2);

  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "travel-planner-backup-v4.json";
  a.click();

  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);

      if (imported.trips && Array.isArray(imported.trips)) {
        trips = imported.trips;
      } else {
        alert("올바른 백업 파일이 아니야.");
        return;
      }

      currentTripId = trips.length ? sortedTrips()[0].id : null;

      saveTrips();
      renderHome();

      if (currentTripId) {
        openTrip(currentTripId);
      }

      alert("백업을 불러왔어.");
    } catch {
      alert("파일을 불러오지 못했어.");
    }
  };

  reader.readAsText(file);
}

document.addEventListener("click", function() {
  closeAllTripMenus();
});

createHourMinuteOptions();
renderHome();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}