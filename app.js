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

const themePresets = {
  midnight: {
    main: "#111827",
    bg: "#f3f4f6"
  },
  purple: {
    main: "#4c1d95",
    bg: "#f5f3ff"
  },
  emerald: {
    main: "#065f46",
    bg: "#ecfdf5"
  },
  wine: {
    main: "#7f1d1d",
    bg: "#fef2f2"
  },
  teal: {
    main: "#134e4a",
    bg: "#f0fdfa"
  }
};

let trips = JSON.parse(localStorage.getItem("travelTripsV5")) || [];
let currentTripId = localStorage.getItem("currentTripIdV5") || null;
let markers = [];
let map;
let tempMarker = null;
let routeLine = null;
let editingPlaceId = null;
let draggedPlaceId = null;

function saveTrips() {
  localStorage.setItem("travelTripsV5", JSON.stringify(trips));
  localStorage.setItem("currentTripIdV5", currentTripId || "");
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

function openSettingsModal() {
  const theme = getSavedTheme();

  document.getElementById("mainColorPicker").value = theme.main;
  document.getElementById("bgColorPicker").value = theme.bg;
  document.getElementById("settingsModal").classList.add("active");
}

function closeSettingsModal() {
  document.getElementById("settingsModal").classList.remove("active");
}

function getSavedTheme() {
  return JSON.parse(localStorage.getItem("travelThemeV1")) || {
    main: "#111827",
    bg: "#f3f4f6"
  };
}

function applyTheme(theme) {
  document.documentElement.style.setProperty("--main-color", theme.main);
  document.documentElement.style.setProperty("--bg-color", theme.bg);

  const metaThemeColor = document.querySelector("meta[name='theme-color']");
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", theme.main);
  }
}

function applyPresetTheme() {
  const presetKey = document.getElementById("themePreset").value;

  if (!presetKey || !themePresets[presetKey]) return;

  document.getElementById("mainColorPicker").value = themePresets[presetKey].main;
  document.getElementById("bgColorPicker").value = themePresets[presetKey].bg;
}

function saveThemeSettings() {
  const theme = {
    main: document.getElementById("mainColorPicker").value,
    bg: document.getElementById("bgColorPicker").value
  };

  localStorage.setItem("travelThemeV1", JSON.stringify(theme));
  applyTheme(theme);
  closeSettingsModal();
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
    alert("계획 이름, 시작일, 종료일을 입력해주세요");
    return;
  }

  if (startDate > endDate) {
    alert("시작일이 종료일보다 늦을 수 없습니다");
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
        아직 여행 계획이 없습니다<br>
        + New Trip 버튼으로 새 여행을 만들어주세요
      </div>
    `;
    return;
  }

  list.forEach(trip => {
    const totalCost = trip.places.reduce((sum, place) => sum + Number(place.cost || 0), 0);
    const totalLocalCost = trip.places.reduce((sum, place) => sum + Number(place.localCost || 0), 0);

    const card = document.createElement("div");
    card.className = "trip-card";
    card.onclick = () => openTrip(trip.id);

    card.innerHTML = `
      <div class="trip-header">
        <div>
          <h3>${trip.name}</h3>
          <div class="small">
            기간: ${trip.startDate} ~ ${trip.endDate}<br>
            저장된 장소: ${trip.places.length}곳
          </div>

          <div class="cost-big">
            ₩${totalCost.toLocaleString()}<br>
            ¥${totalLocalCost.toLocaleString()}
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

  if (!confirm(`'${trip.name}' 여행을 삭제할까요?\n저장된 장소도 모두 삭제됩니다.`)) {
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
    normalizePlaceOrders();
    renderCurrentTripInfo();
    renderPlaces();
  }, 100);
}

function goHome() {
  document.getElementById("detailScreen").classList.remove("active");
  document.getElementById("homeScreen").classList.add("active");
  document.getElementById("backBtn").style.display = "none";
  document.getElementById("headerTitle").textContent = "Travel Planner";

  cancelEdit();
  renderHome();
}

function renderCurrentTripInfo() {
  const box = document.getElementById("currentTripInfo");
  const trip = getCurrentTrip();

  if (!trip) {
    box.innerHTML = "선택된 여행이 없습니다";
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

  L.tileLayer("https://tile.openstreetmap.de/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

  map.on("click", function(e) {
    document.getElementById("lat").value = e.latlng.lat.toFixed(6);
    document.getElementById("lng").value = e.latlng.lng.toFixed(6);

    setTempMarker(e.latlng.lat, e.latlng.lng);
  });
}

function clearMarkers() {
  if (!map) return;

  markers.forEach(marker => map.removeLayer(marker));
  markers = [];

  if (routeLine) {
    map.removeLayer(routeLine);
    routeLine = null;
  }
}

function createHourMinuteOptions() {
  const hourList = document.getElementById("hourList");
  const minuteList = document.getElementById("minuteList");

  hourList.innerHTML = "";
  minuteList.innerHTML = "";

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

function setTempMarker(lat, lng) {
  if (!map) return;

  if (tempMarker) {
    map.removeLayer(tempMarker);
  }

  tempMarker = L.marker([lat, lng], {
    icon: L.divIcon({
      className: "temp-marker",
      html: `
        <div style="
          background:#facc15;
          width:28px;
          height:28px;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.45);
        "></div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 28]
    })
  }).addTo(map)
    .bindPopup("선택한 위치")
    .openPopup();
}

function clearTempMarker() {
  if (tempMarker) {
    map.removeLayer(tempMarker);
    tempMarker = null;
  }
}

async function searchPlace() {
  const keyword = document.getElementById("searchKeyword").value.trim();

  if (!keyword) {
    alert("검색어를 입력해주세요");
    return;
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(keyword)}&limit=1`;

  try {
    const response = await fetch(url, {
      headers: { "Accept": "application/json" }
    });

    const data = await response.json();

    if (!data.length) {
      alert("검색 결과가 없습니다. 장소명을 조금 더 자세히 입력해주세요.");
      return;
    }

    const result = data[0];

    document.getElementById("placeName").value = result.display_name.split(",")[0];
    document.getElementById("lat").value = Number(result.lat).toFixed(6);
    document.getElementById("lng").value = Number(result.lon).toFixed(6);

    map.setView([result.lat, result.lon], 16);
    setTempMarker(result.lat, result.lon);
  } catch (error) {
    alert("검색에 실패했습니다. 위도와 경도를 직접 입력해주세요.");
  }
}

function normalizePlaceOrders() {
  const trip = getCurrentTrip();

  if (!trip) return;

  let changed = false;

  trip.places.forEach((place, index) => {
    if (place.order === undefined || place.order === null) {
      place.order = index + 1;
      changed = true;
    }
  });

  if (changed) {
    saveTrips();
  }
}

function getNextOrder(trip) {
  if (!trip.places.length) return 1;

  return Math.max(...trip.places.map(place => Number(place.order || 0))) + 1;
}

function buildPlaceData(existingPlace = null) {
  const trip = getCurrentTrip();

  const name = document.getElementById("placeName").value.trim();
  const category = document.getElementById("category").value;
  const date = document.getElementById("date").value;
  const hourInput = document.getElementById("hour").value.trim();
  const minuteInput = document.getElementById("minute").value.trim();
  const lat = parseFloat(document.getElementById("lat").value);
  const lng = parseFloat(document.getElementById("lng").value);
  const cost = Number(document.getElementById("cost").value || 0);
  const localCost = Number(document.getElementById("localCost").value || 0);
  const memo = document.getElementById("memo").value.trim();

  if (!name || !date) {
    alert("장소 이름과 날짜는 꼭 입력해야 합니다.");
    return null;
  }

  if (trip && (date < trip.startDate || date > trip.endDate)) {
    if (!confirm("선택한 날짜가 여행 기간 밖입니다. 그래도 저장할까요?")) {
      return null;
    }
  }

  let time = "";

  if (hourInput || minuteInput) {
    const hour = hourInput ? hourInput.padStart(2, "0") : "00";
    const minute = minuteInput ? minuteInput.padStart(2, "0") : "00";
    time = `${hour}:${minute}`;
  }

  return {
    id: existingPlace ? existingPlace.id : Date.now(),
    name,
    category,
    date,
    time,
    lat: isNaN(lat) ? null : lat,
    lng: isNaN(lng) ? null : lng,
    cost,
    localCost,
    memo,
    rating: existingPlace ? existingPlace.rating || "" : "",
    order: existingPlace ? existingPlace.order : getNextOrder(trip)
  };
}

function savePlace() {
  const trip = getCurrentTrip();

  if (!trip) {
    alert("먼저 여행 계획을 선택해주세요.");
    return;
  }

  if (editingPlaceId) {
    updatePlace();
  } else {
    addPlace();
  }
}

function addPlace() {
  const trip = getCurrentTrip();

  if (!trip) return;

  const place = buildPlaceData();

  if (!place) return;

  trip.places.push(place);

  saveTrips();
  clearPlaceForm();
  renderCurrentTripInfo();
  renderPlaces();
  clearTempMarker();

  if (place.lat !== null && place.lng !== null) {
    map.setView([place.lat, place.lng], 15);
  }
}

function editPlace(id) {
  const trip = getCurrentTrip();

  if (!trip) return;

  const place = trip.places.find(item => String(item.id) === String(id));

  if (!place) return;

  editingPlaceId = id;

  document.getElementById("placeName").value = place.name;
  document.getElementById("category").value = place.category;
  document.getElementById("date").value = place.date;

  if (place.time) {
    const [hour, minute] = place.time.split(":");
    document.getElementById("hour").value = hour || "";
    document.getElementById("minute").value = minute || "";
  } else {
    document.getElementById("hour").value = "";
    document.getElementById("minute").value = "";
  }

  document.getElementById("lat").value = place.lat ?? "";
  document.getElementById("lng").value = place.lng ?? "";
  document.getElementById("cost").value = place.cost || "";
  document.getElementById("localCost").value = place.localCost || "";
  document.getElementById("memo").value = place.memo || "";

  document.getElementById("savePlaceBtn").textContent = "수정 완료";
  document.getElementById("cancelEditBtn").style.display = "block";

  if (place.lat !== null && place.lng !== null) {
    map.setView([place.lat, place.lng], 16);
    setTempMarker(place.lat, place.lng);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updatePlace() {
  const trip = getCurrentTrip();

  if (!trip) return;

  const index = trip.places.findIndex(place => String(place.id) === String(editingPlaceId));

  if (index === -1) return;

  const updatedPlace = buildPlaceData(trip.places[index]);

  if (!updatedPlace) return;

  trip.places[index] = updatedPlace;

  saveTrips();
  cancelEdit();
  renderCurrentTripInfo();
  renderPlaces();
  clearTempMarker();
}

function cancelEdit() {
  editingPlaceId = null;
  clearPlaceForm();

  const savePlaceBtn = document.getElementById("savePlaceBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");

  if (savePlaceBtn) savePlaceBtn.textContent = "장소 추가";
  if (cancelEditBtn) cancelEditBtn.style.display = "none";

  clearTempMarker();
}

function clearPlaceForm() {
  document.getElementById("placeName").value = "";
  document.getElementById("searchKeyword").value = "";
  document.getElementById("hour").value = "";
  document.getElementById("minute").value = "";
  document.getElementById("lat").value = "";
  document.getElementById("lng").value = "";
  document.getElementById("cost").value = "";
  document.getElementById("localCost").value = "";
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
    if (Number(a.order || 0) !== Number(b.order || 0)) {
      return Number(a.order || 0) - Number(b.order || 0);
    }
    return String(a.time || "").localeCompare(String(b.time || ""));
  });

  return filtered;
}

function renderSummary(filtered) {
  const summaryBox = document.getElementById("summaryBox");
  const trip = getCurrentTrip();

  if (!trip) {
    summaryBox.innerHTML = "여행을 선택해주세요.";
    return;
  }

  const totalPlaces = filtered.length;
  const totalCost = filtered.reduce((sum, place) => sum + Number(place.cost || 0), 0);
  const totalLocalCost = filtered.reduce((sum, place) => sum + Number(place.localCost || 0), 0);
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
    예상 경비: ${totalCost.toLocaleString()}원<br>
    현지 통화 합계: ${totalLocalCost.toLocaleString()}<br>
    ${categoryText || "카테고리 없음"}<br>
    <span class="small">카드를 드래그해서 순서를 바꿀 수 있습니다.</span>
  `;
}

function renderRouteLine(filtered) {
  const routePoints = filtered
    .filter(place => place.lat !== null && place.lng !== null)
    .map(place => [place.lat, place.lng]);

  if (routePoints.length >= 2) {
    routeLine = L.polyline(routePoints, {
      color: "#111827",
      weight: 4,
      opacity: 0.7,
      dashArray: "8, 8"
    }).addTo(map);
  }
}

function renderPlaces() {
  const list = document.getElementById("placeList");
  list.innerHTML = "";

  clearMarkers();

  const filtered = getFilteredPlaces();

  renderSummary(filtered);

  filtered.forEach(place => {
    let marker = null;
    const hasLocation = place.lat !== null && place.lng !== null;

    if (hasLocation) {
      marker = L.marker([place.lat, place.lng], {
        icon: getMarkerIcon(place.category)
      })
        .addTo(map)
        .bindPopup(`
          <b>${place.name}</b><br>
          ${place.date} ${place.time || ""}<br>
          ${categoryNames[place.category]}<br>
          예상 경비: ${Number(place.cost || 0).toLocaleString()}원<br>
          현지 통화: ${Number(place.localCost || 0).toLocaleString()}<br>
          추천: ${place.rating || "아직 없음"}
        `);

      markers.push(marker);
    }

    const card = document.createElement("div");
    card.className = "place-card";
    card.style.borderLeftColor = categoryColors[place.category];
    card.draggable = true;
    card.dataset.placeId = place.id;

    card.innerHTML = `
      <div class="drag-hint">↕ 드래그해서 순서 변경</div>
      
			<h3>
				${place.rating === "👍" ? "⭐ " : ""}
				${place.rating === "👎" ? "❌ " : ""}
				${place.time ? place.time + " - " : ""}
				${place.name}
			</h3>

			<div class="small">
			  📅 ${place.date}<br>
			  💰 ${Number(place.cost || 0).toLocaleString()}원<br>
			  💵 ${Number(place.localCost || 0).toLocaleString()}<br>
			  ${place.memo || "메모 없음"}
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
          class="edit"
          onclick="event.stopPropagation(); editPlace(${place.id})">
          ✏️
        </button>

        <button
          class="route"
          onclick="event.stopPropagation(); ${hasLocation ? `openGoogleMap(${place.lat}, ${place.lng})` : `alert('위치 정보가 없습니다.')`}">
          🧭
        </button>

        <button
          class="danger"
          onclick="event.stopPropagation(); deletePlace(${place.id})">
          🗑️
        </button>
      </div>
    `;

    card.addEventListener("dragstart", handleDragStart);
    card.addEventListener("dragover", handleDragOver);
    card.addEventListener("drop", handleDrop);
    card.addEventListener("dragend", handleDragEnd);

    card.onclick = () => {
      if (!hasLocation) return;

      map.setView([place.lat, place.lng], 16);
      marker.openPopup();
    };

    list.appendChild(card);
  });

  renderRouteLine(filtered);

  const placesWithLocation = filtered.filter(place => place.lat !== null && place.lng !== null);

  if (placesWithLocation.length > 0) {
    const bounds = placesWithLocation.map(place => [place.lat, place.lng]);
    map.fitBounds(bounds, { padding: [40, 40] });
  }
}

function handleDragStart(event) {
  draggedPlaceId = event.currentTarget.dataset.placeId;
  event.currentTarget.classList.add("dragging");
}

function handleDragOver(event) {
  event.preventDefault();
}

function handleDrop(event) {
  event.preventDefault();

  const targetPlaceId = event.currentTarget.dataset.placeId;

  if (!draggedPlaceId || draggedPlaceId === targetPlaceId) return;

  reorderPlaces(draggedPlaceId, targetPlaceId);
}

function handleDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  draggedPlaceId = null;
}

function reorderPlaces(fromId, toId) {
  const trip = getCurrentTrip();

  if (!trip) return;

  const filtered = getFilteredPlaces();
  const fromIndex = filtered.findIndex(place => String(place.id) === String(fromId));
  const toIndex = filtered.findIndex(place => String(place.id) === String(toId));

  if (fromIndex === -1 || toIndex === -1) return;

  const moved = filtered.splice(fromIndex, 1)[0];
  filtered.splice(toIndex, 0, moved);

  filtered.forEach((place, index) => {
    const originalPlace = trip.places.find(item => String(item.id) === String(place.id));
    if (originalPlace) {
      originalPlace.order = index + 1;
    }
  });

  saveTrips();
  renderPlaces();
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

  if (!confirm("이 장소를 삭제할까요?")) return;

  trip.places = trip.places.filter(place => place.id !== id);

  if (String(editingPlaceId) === String(id)) {
    cancelEdit();
  }

  saveTrips();
  renderCurrentTripInfo();
  renderPlaces();
}

function openGoogleMap(lat, lng) {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
}

function exportData() {
  const dataStr = JSON.stringify({
    version: 5,
    trips
  }, null, 2);

  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "travel-planner-backup-v5.json";
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
        alert("올바른 백업 파일이 아닙니다.");
        return;
      }

      currentTripId = trips.length ? sortedTrips()[0].id : null;

      saveTrips();
      renderHome();

      if (currentTripId) {
        openTrip(currentTripId);
      }

      alert("백업을 불러왔습니다.");
    } catch {
      alert("파일을 불러오지 못했습니다.");
    }
  };

  reader.readAsText(file);
}

function initTripDateRangePicker() {
  const tripDateRange = document.getElementById("tripDateRange");
  const tripStartDate = document.getElementById("tripStartDate");
  const tripEndDate = document.getElementById("tripEndDate");

  if (!tripDateRange) return;

  flatpickr(tripDateRange, {
    mode: "range",
    dateFormat: "Y-m-d",
    locale: "ko",
    minDate: "2020-01-01",
    showMonths: 1,
    disableMobile: true,
    allowInput: false,

    onOpen: function(selectedDates, dateStr, instance) {
      if (selectedDates.length === 2) {
        instance.clear();
        tripStartDate.value = "";
        tripEndDate.value = "";
        instance.set("minDate", "2020-01-01");
      }
    },

    onChange: function(selectedDates, dateStr, instance) {
      if (selectedDates.length === 1) {
        const start = selectedDates[0];

        tripStartDate.value = instance.formatDate(start, "Y-m-d");
        tripEndDate.value = "";

        instance.set("minDate", start);
      }

      if (selectedDates.length === 2) {
        const start = selectedDates[0];
        const end = selectedDates[1];

        tripStartDate.value = instance.formatDate(start, "Y-m-d");
        tripEndDate.value = instance.formatDate(end, "Y-m-d");

        setTimeout(() => {
          instance.set("minDate", "2020-01-01");
        }, 100);
      }
    },

    onClose: function(selectedDates, dateStr, instance) {
      if (selectedDates.length === 0) {
        tripStartDate.value = "";
        tripEndDate.value = "";
        instance.set("minDate", "2020-01-01");
      }

      if (selectedDates.length === 1) {
        tripEndDate.value = "";
      }
    }
  });
}

document.addEventListener("click", function() {
  closeAllTripMenus();
});

applyTheme(getSavedTheme());
createHourMinuteOptions();
initTripDateRangePicker();
renderHome();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}