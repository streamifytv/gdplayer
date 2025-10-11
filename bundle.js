    // Global variables
    let allChannels = [];
    let scheduleData = null;
    let expandedRows = new Set(); // Start collapsed by default

    // Animate the logo
    function animateLogo() {
        let gdpElement = document.getElementById('gdp');
        if (!gdpElement) return;

        let chars = [...gdpElement.textContent];
        gdpElement.innerHTML = chars.map(c => `<span>${c}</span>`).join('');
        let spans = document.querySelectorAll('#gdp span');
        let i = 0;
        setInterval(() => {
            spans.forEach((s, idx) => s.style.color = idx === i ? 'white' : '#039be5');
            i = (i + 1) % spans.length;
        }, 100);
    }

    // Fetch schedule data
    async function fetchSchedule() {
        const url = 'https://wasitv-pro.site/daddycors.php';
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed ${res.status}`);
        return res.json();
    }

    // Extract all channels from the JSON data
    function extractChannelsFromData(data) {
        const channels = [];
        const today = Object.keys(data)[0];
        const categories = Object.keys(data[today]);

        categories.forEach(category => {
            const events = data[today][category];
            events.forEach(event => {
                const addChannel = ch => channels.push({
                    name: ch.channel_name,
                    category,
                    eventName: event.event,
                    eventTime: event.time,
                    channelId: ch.channel_id
                });

                if (event.channels) event.channels.forEach(addChannel);
                if (event.channels2) event.channels2.forEach(addChannel);
            });
        });

        return channels;
    }

    function groupChannelsByEvent(channels) {
        const map = new Map();
        channels.forEach(ch => {
            const key = `${ch.category}-${ch.eventName}-${ch.eventTime}`;
            if (!map.has(key)) map.set(key, {
                category: ch.category,
                eventName: ch.eventName,
                eventTime: ch.eventTime,
                channels: []
            });
            map.get(key).channels.push(ch);
        });
        return Array.from(map.values());
    }

    function getEventStatus(eventTime) {
        if (!eventTime) return 'Upcoming';
        if (eventTime.toLowerCase().includes('live')) return 'LIVE';

        const now = new Date();
        let eventDate = new Date();
        const match = eventTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
        if (!match) return 'Upcoming';

        let h = parseInt(match[1]);
        const m = parseInt(match[2]);
        const p = match[3];
        if (p && p.toLowerCase() === 'pm' && h < 12) h += 12;
        if (p && p.toLowerCase() === 'am' && h === 12) h = 0;
        let localHours = (h + 5) % 24;
        if (h + 5 >= 24) eventDate.setDate(eventDate.getDate() + 1);
        eventDate.setHours(localHours, m, 0, 0);
        const diff = eventDate - now;
        const hrs = diff / 3600000;
        if (hrs < -2) return 'Completed';
        if (hrs < 0.5 && hrs > -2) return 'LIVE';
        return 'Upcoming';
    }

    function toggleCategoryExpansion(category) {
        const id = `cat-${category}`;
        const icon = document.getElementById(`${id}-icon`);
        const eventRows = document.querySelectorAll(`[data-category="${category}"].event-row`);
        const isExpanded = expandedRows.has(id);

        if (isExpanded) {
            expandedRows.delete(id);
            icon.textContent = '+';
            eventRows.forEach(r => {
                r.style.display = 'none';
                const eventId = r.getAttribute('id');
                expandedRows.delete(eventId);
                document.querySelectorAll(`[data-event="${eventId}"]`).forEach(ch => ch.style.display = 'none');
                const evIcon = document.querySelector(`#${eventId} .expand-icon`);
                if (evIcon) evIcon.textContent = '+';
            });
        } else {
            expandedRows.add(id);
            icon.textContent = '-';
            eventRows.forEach(r => r.style.display = '');
        }
    }

    function toggleEventExpansion(eventId) {
        const icon = document.querySelector(`#${eventId} .expand-icon`);
        const channelRows = document.querySelectorAll(`[data-event="${eventId}"]`);
        const isExpanded = expandedRows.has(eventId);

        if (isExpanded) {
            expandedRows.delete(eventId);
            icon.textContent = '+';
            channelRows.forEach(r => r.style.display = 'none');
        } else {
            expandedRows.add(eventId);
            icon.textContent = '-';
            channelRows.forEach(r => r.style.display = '');
        }
    }

    function openChannelModal(title, id) {
        const modal = document.getElementById('channelModal');
        const iframe = document.getElementById('channelIframe');
        const titleEl = document.getElementById('channelTitle');
        iframe.src = `https://ddlive.streamit.workers.dev/?cid=${id}`;
        titleEl.textContent = title;
        modal.style.display = 'block';
    }

    function renderTable(events) {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';
        const categories = [...new Set(events.map(e => e.category))];

        categories.forEach(category => {
            // Category row
            const catId = `cat-${category}`;
            const catRow = document.createElement('tr');
            catRow.className = 'category-row';
            catRow.innerHTML = `
                <td colspan="5">
                    <span class="expand-icon" id="${catId}-icon" onclick="toggleCategoryExpansion('${category}')">+</span>
                    ${category}
                </td>`;
            tbody.appendChild(catRow);

            events.filter(e => e.category === category).forEach((ev, i) => {
                const evId = `ev-${category}-${i}`;
                const status = getEventStatus(ev.eventTime);
                const statusClass = status === 'LIVE' ? 'status-live' :
                                    status === 'Upcoming' ? 'status-upcoming' : 'status-completed';

                // Event row (hidden by default)
                const eventRow = document.createElement('tr');
                eventRow.className = 'event-row';
                eventRow.id = evId;
                eventRow.dataset.category = category;
                eventRow.style.display = 'none';
                eventRow.innerHTML = `
                    <td></td>
                    <td>
                        <span class="expand-icon" onclick="toggleEventExpansion('${evId}')">+</span>
                        ${ev.eventName}
                    </td>
                    <td>${ev.eventTime}</td>
                    <td><span class="${statusClass}">${status}</span></td>
                    <td>${ev.channels.length} Streams</td>
                `;
                tbody.appendChild(eventRow);

                // Channel rows (hidden by default)
                ev.channels.forEach(ch => {
                    const channelRow = document.createElement('tr');
                    channelRow.className = 'channel-row';
                    channelRow.dataset.event = evId;
                    channelRow.style.display = 'none';
                    channelRow.innerHTML = `
                        <td></td>
                        <td colspan="2">${ch.name}</td>
                        <td></td>
                        <td>
                            <a href="#" class="stream-btn" onclick="openChannelModal('${ch.name}', '${ch.channelId}')">
                                <i class="fas fa-play"></i> Play
                            </a>
                        </td>
                    `;
                    tbody.appendChild(channelRow);
                });
            });
        });
    }

    // Channel modal close
    document.querySelector('#channelModal .close').onclick = () => {
        document.getElementById('channelModal').style.display = 'none';
        document.getElementById('channelIframe').src = '';
    };
    window.onclick = e => {
        if (e.target === document.getElementById('channelModal')) {
            document.getElementById('channelModal').style.display = 'none';
            document.getElementById('channelIframe').src = '';
        }
    };

    async function init() {
        animateLogo();
        try {
            const data = await fetchSchedule();
            scheduleData = data;
            allChannels = extractChannelsFromData(data);
            const grouped = groupChannelsByEvent(allChannels);
            renderTable(grouped);
            document.getElementById('loadingSpinner').style.display = 'none';
            document.getElementById('resultCount').textContent = `${grouped.length} Events Loaded`;
        } catch (err) {
            console.error(err);
            document.getElementById('loadingSpinner').style.display = 'none';
            document.getElementById('errorMessage').classList.remove('d-none');
        }
    }

    init();