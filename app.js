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

let trips = JSON.parse(localStorage.getItem("travelTripsV3")) || [];
let currentTripId = localStorage.getItem("currentTripIdV3") || null;
let markers = [];

const map = L.map("map").setView([34.6937, 135.5023], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

function saveTrips() {
  localStorage.setItem("travelTripsV3", JSON.stringify(trips));
  localStorage.setItem("currentTripIdV3", currentTripId || "");
}

function getCurrentTrip() {
  return trips.find(trip => String(trip.id) === String(currentTripId));
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
    places: []
  };

  trips.push(trip);
  currentTripId = trip.id;

  document.getElementById("tripName").value = "";
  document.getElementById("tripStartDate").value = "";
  document.getElementById("tripEndDate").value = "";

  saveTrips();
  renderTrips();
  renderPlaces();
}

function deleteTrip() {
  const trip = getCurrentTrip();

  if (!trip) {
    alert("삭제할 계획이 없어.");
    return;
  }

  if (!confirm(`'${trip.name}' 계획을 삭제할까? 안에 저장된 장소도 모두 삭제돼.`)) {
    return;
  }

  trips = trips.filter(item => String(item.id) !== String(currentTripId));
  currentTripId = trips.length ? trips[0].id : null;

  saveTrips();
  renderTrips();
  renderPlaces();
}

function changeTrip() {
  currentTripId = document.getElementById("tripSelect").value;
  saveTrips();
  renderTripInfo();
  renderPlaces();
}

function renderTrips() {
  const tripSelect = document.getElementById("tripSelect");

  tripSelect.innerHTML = "";

  if (trips.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "여행 계획을 먼저 추가해줘";
    tripSelect.appendChild(option);
    currentTripId = null;
    renderTripInfo();
    return;
  }

  if (!currentTripId || !trips.some(trip => String(trip.id) === String(currentTripId))) {
    currentTripId = trips[0].id;
  }

  trips.forEach(trip => {
    const option = document.createElement("option");
    option.value = trip.id;
    option.textContent = `${trip.name} (${trip.startDate} ~ ${trip.endDate})`;

    if (String(trip.id) === String(currentTripId)) {
      option.selected = true;
    }

    tripSelect.appendChild(option);
  });

  renderTripInfo();
}

function renderTripInfo() {
  const tripInfo = document.getElementById("tripInfo");
  const trip = getCurrentTrip();

  if (!trip) {
    tripInfo.innerHTML = "선택된 여행 계획이 없습니다.";
    return;
  }

  tripInfo.innerHTML = `
    <b>${trip.name}</b><br>
    기간: ${trip.startDate} ~ ${trip.endDate}<br>
    저장된 장소: ${trip.places.length}곳
  `;
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
      headers: {
        "Accept": "application/json"
      }
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
    alert("먼저 여행 계획을 만들어줘.");
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
  const time = `${hour}:${minute}`;

  const place = {
    id: Date.now(),
    name,
    category,
    date,
    time,
    lat,
    lng,
    cost,
    memo,
    rating: ""
  };

  trip.places.push(place);

  saveTrips();
  clearForm();
  renderTrips();
  renderPlaces();

  map.setView([lat, lng], 15);
}

function clearForm() {
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
    summaryBox.innerHTML = "여행 계획을 먼저 추가해줘.";
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
    <b>${trip.name} 일정 요약</b><br>
    기간: ${trip.startDate} ~ ${trip.endDate}<br>
    표시된 장소: ${totalPlaces}곳<br>
    예상 경비: ${totalCost.toLocaleString()}엔<br>
    ${categoryText || "카테고리 없음"}
  `;
}

function renderPlaces() {
  const list = document.getElementById("placeList");
  list.innerHTML = "";

  markers.forEach(marker => map.removeLayer(marker));
  markers = [];

  const filtered = getFilteredPlaces();

  renderSummary(filtered);
  renderTripInfo();

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
        위도: ${place.lat}, 경도: ${place.lng}<br>
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
  renderTrips();
  renderPlaces();
}

function openGoogleMap(lat, lng) {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
}

function exportData() {
  const dataStr = JSON.stringify({
    version: 3,
    trips
  }, null, 2);

  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "travel-planner-backup-v3.json";
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

      if (Array.isArray(imported)) {
        trips = [
          {
            id: Date.now(),
            name: "가져온 여행 계획",
            startDate: "",
            endDate: "",
            places: imported
          }
        ];
      } else if (imported.trips && Array.isArray(imported.trips)) {
        trips = imported.trips;
      } else {
        alert("올바른 백업 파일이 아니야.");
        return;
      }

      currentTripId = trips.length ? trips[0].id : null;

      saveTrips();
      renderTrips();
      renderPlaces();

      alert("백업을 불러왔어.");
    } catch {
      alert("파일을 불러오지 못했어.");
    }
  };

  reader.readAsText(file);
}

map.on("click", function(e) {
  document.getElementById("lat").value = e.latlng.lat.toFixed(6);
  document.getElementById("lng").value = e.latlng.lng.toFixed(6);
});

createHourMinuteOptions();
renderTrips();
renderPlaces();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}