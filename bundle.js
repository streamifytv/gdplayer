    // Global variables
    let allChannels = [];
    let scheduleData = null;
    let expandedRows = new Set(); // Start collapsed by default

    // Helper: Convert any string to a valid HTML ID
    function toSafeId(str) {
        return str.replace(/[^a-zA-Z0-9-_]/g, '_').replace(/_{2,}/g, '_').replace(/^_|_$/g, '');
    }

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
  if (!eventTime) return "Upcoming";
  if (eventTime.toLowerCase().includes("live")) return "LIVE";

  const now = new Date();
  const [h, m] = eventTime.split(":").map(Number);
  const eventDate = new Date();

  eventDate.setHours(h, m, 0, 0);

  const hrs = (eventDate - now) / 3600000;
  return hrs < -2 ? "Completed" : hrs < 0.5 ? "LIVE" : "Upcoming";
}

    function toggleCategoryExpansion(category) {
        const safeCat = toSafeId(category);
        const catId = `cat-${safeCat}`;
        const icon = document.getElementById(`${catId}-icon`);
        if (!icon) {
            console.warn('Category icon not found for:', category);
            return;
        }

        const eventRows = document.querySelectorAll(`tr.event-row[data-category-safe="${safeCat}"]`);
        const isExpanded = expandedRows.has(catId);

        if (isExpanded) {
            // Collapse
            expandedRows.delete(catId);
            icon.textContent = '+';
            eventRows.forEach(r => {
                r.style.display = 'none';
                const eventId = r.id;
                expandedRows.delete(eventId);
                // Collapse all channels under this event
                document.querySelectorAll(`tr.channel-row[data-event="${eventId}"]`).forEach(ch => {
                    ch.style.display = 'none';
                });
                // Reset event expand icon
                const evIcon = r.querySelector('.expand-icon');
                if (evIcon) evIcon.textContent = '+';
            });
        } else {
            // Expand
            expandedRows.add(catId);
            icon.textContent = '-';
            eventRows.forEach(r => {
                r.style.display = '';
            });
        }
    }

    function toggleEventExpansion(eventId) {
        const eventRow = document.getElementById(eventId);
        if (!eventRow) return;

        const icon = eventRow.querySelector('.expand-icon');
        const channelRows = document.querySelectorAll(`tr.channel-row[data-event="${eventId}"]`);
        const isExpanded = expandedRows.has(eventId);

        if (isExpanded) {
            expandedRows.delete(eventId);
            if (icon) icon.textContent = '+';
            channelRows.forEach(r => r.style.display = 'none');
        } else {
            expandedRows.add(eventId);
            if (icon) icon.textContent = '-';
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
            const safeCat = toSafeId(category);
            const catId = `cat-${safeCat}`;

            // Category row
            const catRow = document.createElement('tr');
            catRow.className = 'category-row';
            catRow.innerHTML = `
                <td colspan="5">
                    <span class="expand-icon" id="${catId}-icon">+</span>
                    ${category}
                </td>`;
            tbody.appendChild(catRow);

            // Attach click listener safely in JS (avoids quote escaping issues)
            const icon = catRow.querySelector('.expand-icon');
            if (icon) {
                icon.addEventListener('click', () => {
                    toggleCategoryExpansion(category);
                });
            }

            events.filter(e => e.category === category).forEach((ev, i) => {
                const evId = `ev-${safeCat}-${i}`;
                const status = getEventStatus(ev.eventTime);
                const statusClass = status === 'LIVE' ? 'status-live' :
                                    status === 'Upcoming' ? 'status-upcoming' : 'status-completed';

                // Event row — HIDDEN BY DEFAULT
                const eventRow = document.createElement('tr');
                eventRow.className = 'event-row';
                eventRow.id = evId;
                eventRow.dataset.categorySafe = safeCat;
                eventRow.style.display = 'none';
                let [first, last] = ev.eventName.split(/:(.+)/);
                eventRow.innerHTML = `
                    <td><span class="expand-icon">+</span>
<strong style="color:lime;">${first}</strong>: ${last}
                    </td>
                    <td>${ev.eventTime}</td>
                    <td><span class="${statusClass}">${status}</span></td>
                    <td>${ev.channels.length} Streams</td>
                `;
                tbody.appendChild(eventRow);

                // Attach event toggle
                const evIcon = eventRow.querySelector('.expand-icon');
                if (evIcon) {
                    evIcon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        toggleEventExpansion(evId);
                    });
                }

                // Channel rows — HIDDEN BY DEFAULT
                ev.channels.forEach(ch => {
                    const channelRow = document.createElement('tr');
                    channelRow.className = 'channel-row';
                    channelRow.dataset.event = evId;
                    channelRow.style.display = 'none';
                    channelRow.innerHTML = `

                       <td colspan="2"><strong><i class="fas fa-play"></i> ${ch.name}</strong></td>
                        <td>
                            <a href="#" class="stream-btn">
                                <i class="fas fa-play"></i> Play
                            </a>
                        </td>
                    `;
                    tbody.appendChild(channelRow);

                    // Attach stream button click
                    const btn = channelRow.querySelector('.stream-btn');
                    if (btn) {
                        btn.addEventListener('click', (e) => {
                            e.preventDefault();
                            openChannelModal(ch.name, ch.channelId);
                        });
                    }
                });
            });
        });
    }

    // Modal close
    document.querySelector('#channelModal .close')?.addEventListener('click', () => {
        document.getElementById('channelModal').style.display = 'none';
        document.getElementById('channelIframe').src = '';
    });

    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('channelModal')) {
            document.getElementById('channelModal').style.display = 'none';
            document.getElementById('channelIframe').src = '';
        }
    });

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
            console.error('Init error:', err);
            document.getElementById('loadingSpinner').style.display = 'none';
            document.getElementById('errorMessage').classList.remove('d-none');
            document.getElementById('errorDetails').textContent = err.message || 'Unknown error';
        }
    }

    init();
