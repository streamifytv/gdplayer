let allChannels = [];
        let scheduleData = null;
        let currentCategory = null;
        
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
        
        async function fetchSchedule() {
            const url = 'https://wasitv-pro.site/daddycors.php';
            try {
                const response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return await response.json();
            } catch (err) {
                console.error('Error fetching schedule:', err);
                throw err;
            }
        }
        
        function extractChannelsFromData(data) {
            const channels = [];
            const today = Object.keys(data)[0];
            const categories = Object.keys(data[today]);
        
            categories.forEach(category => {
                const events = data[today][category];
                events.forEach(event => {
                    if (event.channels && event.channels.length > 0) {
                        event.channels.forEach(channel => {
                            channels.push({
                                name: channel.channel_name,
                                category: category,
                                url: `${channel.channel_id}`,
                                eventName: event.event,
                                eventTime: event.time,
                                channelId: channel.channel_id
                            });
                        });
                    }
                    if (event.channels2 && event.channels2.length > 0) {
                        event.channels2.forEach(channel => {
                            channels.push({
                                name: channel.channel_name,
                                category: category,
                                url: `${channel.channel_id}`,
                                eventName: event.event,
                                eventTime: event.time,
                                channelId: channel.channel_id
                            });
                        });
                    }
                });
            });
            return channels;
        }
        
        function groupChannelsByEvent(channels) {
            const eventsMap = new Map();
            channels.forEach(channel => {
                const eventKey = `${channel.eventName || 'Unknown Event'}-${channel.eventTime || 'Unknown Time'}-${channel.category}`;
                if (!eventsMap.has(eventKey)) {
                    eventsMap.set(eventKey, {
                        eventName: channel.eventName,
                        eventTime: channel.eventTime,
                        category: channel.category,
                        channels: []
                    });
                }
                eventsMap.get(eventKey).channels.push({
                    name: channel.name,
                    url: channel.url,
                    channelId: channel.channelId
                });
            });
            return Array.from(eventsMap.values());
        }
        
        function createCategoryButtons(data) {
            const categoriesContainer = document.getElementById('categoriesContainer');
            const today = Object.keys(data)[0];
            const categories = Object.keys(data[today]);
            categories.forEach((category, index) => {
                const button = document.createElement('button');
                button.className = `category-btn ${index === 0 ? 'active first-category' : ''}`;
                button.dataset.category = category;
                button.textContent = category;
                categoriesContainer.appendChild(button);
            });
            if (categories.length > 0) currentCategory = categories[0];
        }
        
        function getEventStatus(eventTime) {
            if (!eventTime) return 'Upcoming';
            if (eventTime.toLowerCase().includes('live')) return 'LIVE';
        
            const now = new Date();
            let eventDate = new Date();
            const timeMatch = eventTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]);
                const period = timeMatch[3];
        
                if (period && period.toLowerCase() === 'pm' && hours < 12) hours += 12;
                else if (period && period.toLowerCase() === 'am' && hours === 12) hours = 0;
        
                // Shift UTC to Pakistan Time (UTC+5)
                let localHours = (hours + 5) % 24;
                if (hours + 5 >= 24) eventDate.setDate(eventDate.getDate() + 1);
                eventDate.setHours(localHours, minutes, 0, 0);
        
                const timeDiff = eventDate - now;
                const hoursDiff = timeDiff / (1000 * 60 * 60);
        
                if (hoursDiff < -2) return 'Completed';
                else if (hoursDiff < 0.5 && hoursDiff > -2) return 'LIVE';
                else return 'Upcoming';
            }
            return 'Upcoming';
        }
        
        function formatEventTime(eventTime) {
            if (!eventTime) return 'Time not available';
            if (eventTime.includes('LIVE') || eventTime.includes('Completed')) return eventTime;
        
            const timeMatch = eventTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]);
                let period = timeMatch[3] ? timeMatch[3].toUpperCase() : '';
        
                if (!period && hours >= 12) {
                    period = 'PM';
                    if (hours > 12) hours -= 12;
                } else if (!period && hours === 0) {
                    hours = 12;
                    period = 'AM';
                } else if (period === 'AM' && hours === 12) {
                    hours = 12;
                } else if (period === 'PM' && hours < 12) {
                    hours += 12;
                    if (hours > 12) hours -= 12;
                }
        
                return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
            }
            return eventTime;
        }
        
        function getStatusClass(status) {
            if (status === 'LIVE') return 'status-live';
            if (status === 'Upcoming') return 'status-upcoming';
            return 'status-completed';
        }
        
        function renderChannelGrid() {
            const channelGrid = document.getElementById('channelGrid');
            channelGrid.innerHTML = '';
            const keyword = document.getElementById('search').value.toLowerCase().trim();
        
            let filteredChannels = allChannels.filter(channel =>
                (channel.name.toLowerCase().includes(keyword) ||
                 channel.category.toLowerCase().includes(keyword) ||
                 (channel.eventName && channel.eventName.toLowerCase().includes(keyword))) &&
                (currentCategory ? channel.category === currentCategory : true)
            );
        
            const groupedEvents = groupChannelsByEvent(filteredChannels);
        
            if (groupedEvents.length === 0) {
                document.getElementById('noResults').classList.remove('d-none');
            } else {
                document.getElementById('noResults').classList.add('d-none');
            }
        
            groupedEvents.forEach(event => {
                const col = document.createElement('div');
                col.className = 'col-6 col-md-3 col-lg-2';
        
                const eventStatus = getEventStatus(event.eventTime);
                const statusClass = getStatusClass(eventStatus);
                const formattedTime = formatEventTime(event.eventTime);
                let eventName = event.eventName || (event.channels.length > 0 ? event.channels[0].name : "Event Information Not Available");
        
                let streamsHTML = '';
                if (event.channels && event.channels.length > 0) {
                    streamsHTML = '<div class="streams-container">';
                    event.channels.forEach(channel => {
                        streamsHTML += `
                            <a href="#" data-url="${channel.url}" data-name="${channel.name}" class="stream-btn open-channel">
                                <i class="fas fa-play-circle"></i> ${channel.name}
                            </a>`;
                    });
                    streamsHTML += '</div>';
                }
        
                col.innerHTML = `
                    <div class="channel-card">
                        <div class="channel-image-container">
                            <img src="https://wasitv-pro.site/ailogo.php?logo=${encodeURIComponent(eventName)}" alt="${eventName}" class="channel-image">
                            <div class="status-badge ${statusClass}">${eventStatus}</div>
                            <div class="time-indicator">${formattedTime}</div>
                        </div>
                        <div class="event-info">
                            <div class="teams-vs"><marquee>${eventName}</marquee></div>
                            ${streamsHTML}
                            <div class="category-label">${event.category}</div>
                        </div>
                    </div>
                `;
                channelGrid.appendChild(col);
            });
        
            document.querySelectorAll('.open-channel').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    openChannelViewer(this.dataset.url, this.dataset.name);
                });
            });
        
            updateResultCount(groupedEvents.length);
        }
        
        function updateResultCount(count) {
            const resultElement = document.getElementById('resultCount');
            resultElement.textContent = currentCategory
                ? `Showing ${count} event${count !== 1 ? 's' : ''} in ${currentCategory}`
                : `Showing ${count} event${count !== 1 ? 's' : ''}`;
        }
        
        function openChannelViewer(id, name) {
            document.getElementById('viewerTitle').textContent = name || 'Live Stream';
            const iframe = document.getElementById('channelFrame');
            iframe.src = `https://ava.karmakurama.com/?id=${encodeURIComponent(id)}`;
            document.getElementById('iframeViewer').style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
        
        function closeViewer() {
            const iframe = document.getElementById('channelFrame');
            iframe.src = 'about:blank';
            document.getElementById('iframeViewer').style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            animateLogo();
        
            fetchSchedule()
                .then(data => {
                    scheduleData = data;
                    allChannels = extractChannelsFromData(data);
                    createCategoryButtons(data);
                    renderChannelGrid();
                    document.getElementById('loadingSpinner').classList.add('d-none');
        
                    document.getElementById('categoriesContainer').addEventListener('click', function(e) {
                        if (e.target.classList.contains('category-btn')) {
                            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                            e.target.classList.add('active');
                            currentCategory = e.target.dataset.category;
                            renderChannelGrid();
                        }
                    });
                })
                .catch(err => {
                    console.error('Failed to load schedule data:', err);
                    document.getElementById('loadingSpinner').innerHTML = `
                        <div class="alert alert-danger" role="alert">
                            Failed to load channels. Please try again later.
                        </div>
                    `;
                });
        
            document.getElementById('search').addEventListener('input', renderChannelGrid);
            document.getElementById('closeViewer').addEventListener('click', closeViewer);
        
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && document.getElementById('iframeViewer').style.display === 'flex') {
                    closeViewer();
                }
            });
        });
