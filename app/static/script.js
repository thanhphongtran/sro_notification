// PagerDuty Notification Generator JavaScript

// Global variable to store incident data for instant updates
let cachedIncidentData = null;

// Global variable to store notification template
let notificationTemplate = null;

// Function to update incident information section
function updateIncidentInfo(incidentData) {
    const incidentInfoSection = document.getElementById('incident-info-section');
    const incidentLinkContainer = document.getElementById('incident-link-container');
    const incidentLink = document.getElementById('incident-link');
    const conferenceBridgeContainer = document.getElementById('conference-bridge-container');
    const conferenceInfo = document.getElementById('conference-info');
    const conferenceDialLink = document.getElementById('conference-dial-link');
    const conferenceMeetingLink = document.getElementById('conference-meeting-link');
    const noConferenceBridge = document.getElementById('no-conference-bridge');
    const slackChannelContainer = document.getElementById('slack-channel-container');
    const slackChannelInfo = document.getElementById('slack-channel-info');
    const slackChannelName = document.getElementById('slack-channel-name');
    const noSlackChannel = document.getElementById('no-slack-channel');

    if (!incidentData || !incidentData.incident) {
        incidentInfoSection.classList.add('hidden');
        return;
    }

    // Show the incident info section
    incidentInfoSection.classList.remove('hidden');

    // Update incident link
    const incidentNumber = incidentData.incident.incident_number;
    const incidentUrl = `https://discoveryinc.pagerduty.com/incidents/${incidentNumber}`;
    incidentLink.href = incidentUrl;
    incidentLink.textContent = `PD#${incidentNumber}`;
    incidentLinkContainer.classList.remove('hidden');

    // Update conference bridge information
    const conferenceBridge = incidentData.incident.conference_bridge;
    if (conferenceBridge && (conferenceBridge.conference_number || conferenceBridge.conference_url)) {
        conferenceBridgeContainer.classList.remove('hidden');
        conferenceInfo.classList.remove('hidden');
        noConferenceBridge.classList.add('hidden');
        
        if (conferenceBridge.conference_number) {
            conferenceDialLink.href = `tel:${conferenceBridge.conference_number}`;
            conferenceDialLink.textContent = "📞 Dial in";
        } else {
            conferenceDialLink.style.display = 'none';
        }
        
        if (conferenceBridge.conference_url) {
            conferenceMeetingLink.href = conferenceBridge.conference_url;
            conferenceMeetingLink.textContent = "🖥️ Zoom";
        } else {
            conferenceMeetingLink.style.display = 'none';
        }
    } else {
        conferenceBridgeContainer.classList.remove('hidden');
        conferenceInfo.classList.add('hidden');
        noConferenceBridge.classList.remove('hidden');
    }

    // Update Slack channel information
    const slackChannel = incidentData.slack_channel;
    if (slackChannel && slackChannel.chat_channel_name) {
        slackChannelContainer.classList.remove('hidden');
        slackChannelName.textContent = `#${slackChannel.chat_channel_name}`;
        slackChannelName.href = slackChannel.chat_channel_web_link;
        slackChannelInfo.classList.remove('hidden');
        noSlackChannel.classList.add('hidden');
    } else {
        slackChannelContainer.classList.remove('hidden');
        slackChannelInfo.classList.add('hidden');
        noSlackChannel.classList.remove('hidden');
    }
}

// Function to get formatted text content preserving line breaks
function getFormattedTextContent(element) {
    if (!element) return '';
    
    // Get the innerHTML and convert <br> tags to newlines
    let content = element.innerHTML || '';
    
    // Replace <br> and <br/> tags with newlines
    content = content.replace(/<br\s*\/?>/gi, '\n');
    
    // Replace <div> tags with newlines (for block elements)
    content = content.replace(/<\/div>/gi, '\n');
    content = content.replace(/<div[^>]*>/gi, '');
    
    // Replace <p> tags with newlines
    content = content.replace(/<\/p>/gi, '\n');
    content = content.replace(/<p[^>]*>/gi, '');
    
    // Remove other HTML tags
    content = content.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    content = tempDiv.textContent || tempDiv.innerText || '';
    
    // Clean up the content
    // Replace multiple spaces with single space
    content = content.replace(/[ \t]+/g, ' ');
    
    // Ensure proper line breaks between different sections
    // Add newline after header (before Update line)
    content = content.replace(/(https:\/\/discoveryinc\.pagerduty\.com\/incidents\/\d+)\s*([A-Z][a-z]+ \d+)/g, '$1\n\n$2');
    
    // Add newline after update line (before bullets)
    content = content.replace(/(\d+:\d+ [AP]M [A-Z]{3,4})\s*(-)/g, '$1\n$2');
    
    // Add newline before Status Dashboard
    content = content.replace(/([.!?])\s*(Status Dashboard)/g, '$1\n\n$2');
    
    // Clean up multiple consecutive newlines (but preserve double newlines for sections)
    content = content.replace(/\n\s*\n\s*\n+/g, '\n\n');
    
    // Trim whitespace
    content = content.trim();
    
    return content;
}

// Function to add event listeners to contentEditable div to ensure proper line breaks
function addContentEditableListeners(element) {
    if (!element || element.contentEditable !== 'true') return;
    
    // Remove existing listeners to avoid duplicates
    element.removeEventListener('input', handleContentEditableInput);
    element.removeEventListener('keydown', handleContentEditableKeydown);
    
    // Add input event listener to handle text changes
    element.addEventListener('input', handleContentEditableInput);
    
    // Add keydown event listener to handle Enter key
    element.addEventListener('keydown', handleContentEditableKeydown);
}

// Handle input events in contentEditable div
function handleContentEditableInput(event) {
    const element = event.target;
    if (!element || element.contentEditable !== 'true') return;
    
    // Get the current content
    let content = element.innerHTML;
    
    // Ensure proper line breaks between sections
    // Add newline after header (before Update line)
    content = content.replace(/(https:\/\/discoveryinc\.pagerduty\.com\/incidents\/\d+)([A-Z][a-z]+ \d+)/g, '$1<br><br>$2');
    
    // Add newline after update line (before bullets)
    content = content.replace(/(\d+:\d+ [AP]M [A-Z]{3,4})(-)/g, '$1<br>$2');
    
    // Add newline before Status Dashboard
    content = content.replace(/([.!?])(Status Dashboard)/g, '$1<br><br>$2');
    
    // Only update if content changed to avoid infinite loops
    if (content !== element.innerHTML) {
        element.innerHTML = content;
    }
}

// Handle keydown events in contentEditable div
function handleContentEditableKeydown(event) {
    const element = event.target;
    if (!element || element.contentEditable !== 'true') return;
    
    // Handle Enter key
    if (event.key === 'Enter') {
        event.preventDefault();
        
        // Insert a <br> tag at the cursor position
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const br = document.createElement('br');
            range.deleteContents();
            range.insertNode(br);
            
            // Move cursor after the <br>
            range.setStartAfter(br);
            range.setEndAfter(br);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
}

// Function to load notification template
async function loadNotificationTemplate() {
    try {
        const response = await fetch('/api/template');
        if (response.ok) {
            notificationTemplate = await response.json();
        } else {
            console.warn('Failed to load notification template, using defaults');
            // Set default template if API fails
            notificationTemplate = {
                header_template: "SEV {severity} | {title} | {incident_url}",
                update_template: "{update_prefix}Update {update_number} | {created_at}",
                bullet_templates: {
                    "initial_sro_report": 'SRO US received a report stating "{alert_title}".',
                    "team_engaged": "The {team_name} team has been engaged to investigate the incident.",
                    "team_has": "The {team_name} team has",
                    "downgraded": "The severity of this incident has been downgraded to a SEV {new_severity}.",
                    "resolved": "This incident is resolved.",
                    "no_further_updates": "No further updates will be provided for this incident.",
                    "further_updates_initial": "Further updates will be provided as they become available.",
                    "further_updates_followup": "Further updates will be provided within 2 hours."
                },
                footer_template: "Status Dashboard - {status_dashboard_url}\n\n@here PR",
                status_prefixes: {
                    "resolved": "Resolved",
                    "downgraded": "Downgraded"
                }
            };
        }
    } catch (error) {
        console.error('Error loading notification template:', error);
    }
}


// Function to generate notification message locally (client-side)
function generateNotificationMessageLocally(incidentData, ticketNumber, updateNumber, resolve, downgrade) {
    try {
        // Ensure template is loaded
        if (!notificationTemplate) {
            console.error('Notification template not loaded');
            return null;
        }
        // Extract incident details
        const title = incidentData.incident.title;
        const incidentNumber = incidentData.incident.incident_number;
        const priority = incidentData.incident.priority.name;
        const escalationPolicy = incidentData.incident.escalation_policy.summary;
        const severity = priority.slice(-1);
        
        // Determine which date to use
        let createdAt;
        if (updateNumber === 1) {
            // Use incident creation date for update 1
            createdAt = convertUtcToEastern(incidentData.incident.created_at);
        } else {
            // Use current date for subsequent updates
            const now = new Date();
            const utcString = now.toISOString().replace('Z', '');
            createdAt = convertUtcToEastern(utcString + 'Z');
        }
        
        // Clean up escalation policy name
        const trimmedPolicy = escalationPolicy.split(' - ')[0];
        
        // Clean up title for the SRO message - use everything after the last pipe, or whole string if no pipe
        let alertTitle = title;
        const lastPipe = title.lastIndexOf('|');
        if (lastPipe !== -1) {
            alertTitle = title.substring(lastPipe + 1).trim();
        }
        
        // Create notification message using template
        const bullets = [];
        
        if (updateNumber === 1) {
            bullets.push(notificationTemplate.bullet_templates.initial_sro_report.replace('{alert_title}', alertTitle));
            bullets.push(notificationTemplate.bullet_templates.team_engaged.replace('{team_name}', trimmedPolicy));
        } else {
            bullets.push(notificationTemplate.bullet_templates.team_has.replace('{team_name}', trimmedPolicy));
        }
        
        // Add downgrade bullet if downgrade flag is provided
        if (downgrade) {
            bullets.push(notificationTemplate.bullet_templates.downgraded.replace('{new_severity}', parseInt(severity) + 1));
        }
        
        // Add resolve bullet if resolve flag is provided
        if (resolve) {
            bullets.push(notificationTemplate.bullet_templates.resolved);
        }
        
        // Add final bullet based on flags
        if (resolve || downgrade) {
            bullets.push(notificationTemplate.bullet_templates.no_further_updates);
        } else if (updateNumber === 1) {
            bullets.push(notificationTemplate.bullet_templates.further_updates_initial);
        } else {
            bullets.push(notificationTemplate.bullet_templates.further_updates_followup);
        }
        
        // Create the notification message using template
        const prefixParts = [];
        if (resolve) prefixParts.push(notificationTemplate.status_prefixes.resolved);
        if (downgrade) prefixParts.push(notificationTemplate.status_prefixes.downgraded);
        
        const updatePrefix = prefixParts.length > 0 ? prefixParts.join(" | ") + " | " : "";
        
        // Format using template
        const header = notificationTemplate.header_template
            .replace('{severity}', severity)
            .replace('{title}', title)
            .replace('{incident_url}', `https://discoveryinc.pagerduty.com/incidents/${incidentNumber}`);
        
        const updateLine = notificationTemplate.update_template
            .replace('{update_prefix}', updatePrefix)
            .replace('{update_number}', updateNumber)
            .replace('{created_at}', createdAt);
        
        const footer = notificationTemplate.footer_template
            .replace('{status_dashboard_url}', 'https://discoveryinc.pagerduty.com/status-dashboard');
        
        return `${header}

${updateLine}
${bullets.map(bullet => `- ${bullet}`).join('\n')}

${footer}`;
        
    } catch (error) {
        console.error('Error generating notification locally:', error);
        return null;
    }
}

// Function to convert UTC to Eastern time (client-side version)
function convertUtcToEastern(utcDateString) {
    try {
        const utcDate = new Date(utcDateString);
        const easternDate = new Date(utcDate.toLocaleString("en-US", {timeZone: "America/New_York"}));
        
        const day = easternDate.getDate();
        const month = easternDate.toLocaleString('en-US', { month: 'long' });
        const year = easternDate.getFullYear();
        
        let hour = easternDate.getHours();
        const minute = easternDate.getMinutes();
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        hour = hour ? hour : 12;
        const timeStr = `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`;
        
        const tzAbbr = easternDate.toLocaleString('en-US', { timeZoneName: 'short' }).split(' ').pop();
        
        return `${day}-${month}-${year} | ${timeStr} ${tzAbbr}`;
    } catch (error) {
        return `Error converting date: ${error}`;
    }
}

// Function to fetch and display responders
async function fetchAndDisplayResponders(ticketNumber) {
    const respondersContainer = document.getElementById('responders-container');
    const mobileRespondersContainer = document.getElementById('responders-container-mobile');
    
    if (!ticketNumber) {
        const placeholder = '<div class="text-center text-gray-500 italic py-8"><p>Enter a ticket number to see responders</p></div>';
        if (respondersContainer) respondersContainer.innerHTML = placeholder;
        if (mobileRespondersContainer) mobileRespondersContainer.innerHTML = placeholder;
        return;
    }
    
    try {
        // Add cache-busting parameter to prevent browser caching
        const cacheBuster = new Date().getTime();
        const response = await fetch(`/api/incident/${ticketNumber}?t=${cacheBuster}`, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        if (response.ok) {
            const incidentData = await response.json();
            const respondersResponse = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({
                    ticket_number: ticketNumber,
                    update_number: 1,
                    resolve: false,
                    downgrade: false,
                    show_users: true
                }),
                cache: 'no-cache'
            });
            
            if (respondersResponse.ok) {
                const result = await respondersResponse.json();
                if (result.responders && result.responders.length > 0) {
                    displayResponders(result.responders);
                } else {
                    const noRespondersMsg = '<div class="text-center text-gray-500 italic py-8"><p>No responders found for this incident</p></div>';
                    if (respondersContainer) respondersContainer.innerHTML = noRespondersMsg;
                    if (mobileRespondersContainer) mobileRespondersContainer.innerHTML = noRespondersMsg;
                }
            } else {
                const errorMsg = '<div class="text-center text-gray-500 italic py-8"><p>Error loading responders</p></div>';
                if (respondersContainer) respondersContainer.innerHTML = errorMsg;
                if (mobileRespondersContainer) mobileRespondersContainer.innerHTML = errorMsg;
            }
        } else {
            const notFoundMsg = '<div class="text-center text-gray-500 italic py-8"><p>Incident not found</p></div>';
            if (respondersContainer) respondersContainer.innerHTML = notFoundMsg;
            if (mobileRespondersContainer) mobileRespondersContainer.innerHTML = notFoundMsg;
        }
    } catch (error) {
        const errorMsg = '<div class="text-center text-gray-500 italic py-8"><p>Error loading responders</p></div>';
        if (respondersContainer) respondersContainer.innerHTML = errorMsg;
        if (mobileRespondersContainer) mobileRespondersContainer.innerHTML = errorMsg;
    }
}

// Function to get trimmed policy name (matches pagerduty_client.py logic)
function getTrimmedPolicyName(policyName) {
    if (policyName && policyName.includes(' - ')) {
        return policyName.split(' - ')[0];
    }
    return policyName;
}

// Function to find matching escalation policy color for a team name
function findMatchingEscalationPolicyColor(teamName, escalationPolicyColors) {
    const trimmedTeam = getTrimmedPolicyName(teamName);
    
    // Check for exact match with trimmed team name
    if (trimmedTeam in escalationPolicyColors) {
        return escalationPolicyColors[trimmedTeam];
    }
    
    // Check if the trimmed team name matches any trimmed escalation policy name
    for (const [policyName, color] of Object.entries(escalationPolicyColors)) {
        const trimmedPolicy = getTrimmedPolicyName(policyName);
        if (trimmedTeam === trimmedPolicy) {
            return color;
        }
    }
    
    return null;
}

// Function to extract escalation policy colors from responders data
function extractEscalationPolicyColors(responders) {
    const colors = {};
    responders.forEach(responder => {
        if (responder.team_name && responder.color) {
            colors[responder.team_name] = responder.color;
        }
    });
    return colors;
}

// Function to clear responders section
function clearResponders() {
    const respondersContainer = document.getElementById('responders-container');
    const mobileRespondersContainer = document.getElementById('responders-container-mobile');
    
    const loadingMsg = '<div class="text-center text-gray-500 italic py-8"><div class="spinner"></div>Loading responders...</div>';
    
    if (respondersContainer) {
        respondersContainer.innerHTML = loadingMsg;
    }
    if (mobileRespondersContainer) {
        mobileRespondersContainer.innerHTML = loadingMsg;
    }
}

// Function to display responders
function displayResponders(responders) {
    const respondersContainer = document.getElementById('responders-container');
    const mobileRespondersContainer = document.getElementById('responders-container-mobile');
    let html = '';
    
    // Sort responders: Call Leader Escalation Policy first, GTOC Americas last, others in between
    const sortedResponders = [...responders].sort((a, b) => {
        const aTeamName = a.team_name || '';
        const bTeamName = b.team_name || '';
        
        // Call Leader Escalation Policy goes to top
        if (aTeamName.includes('Call Leader Escalation Policy')) return -1;
        if (bTeamName.includes('Call Leader Escalation Policy')) return 1;
        
        // GTOC Americas goes to bottom
        if (aTeamName.includes('GTOC Americas')) return 1;
        if (bTeamName.includes('GTOC Americas')) return -1;
        
        // All others maintain original order
        return 0;
    });
    
    // Extract escalation policy colors for matching
    const escalationPolicyColors = extractEscalationPolicyColors(sortedResponders);
    
    sortedResponders.forEach(responder => {
        html += '<div class="responder-item">';
        
        // Handle escalation policy responders (has team_name and users)
        if (responder.team_name) {
            const color = responder.color || '#f5f5f5';
            html += `<div class="responder-team escalation-policy" style="background-color: ${color}; border-left: 4px solid ${adjustColorBrightness(color, -20)};">${responder.team_name}</div>`;
            if (responder.users && responder.users.length > 0) {
                html += '<div class="responder-users">';
                html += '<ul class="user-list">';
                responder.users.forEach(user => {
                    // Handle both old format (string) and new format (object with name and requested_at)
                    if (typeof user === 'string') {
                        html += `<li class="user-item">• ${user}</li>`;
                    } else {
                        const userName = user.name || user;
                        const requestedAt = user.requested_at;
                        let timeDisplay = '';
                        
                        if (requestedAt) {
                            try {
                                // Handle both UTC format with Z and without
                                let dateString = requestedAt;
                                if (dateString && !dateString.endsWith('Z') && !dateString.includes('+')) {
                                    dateString += 'Z';
                                }
                                
                                const requestDate = new Date(dateString);
                                
                                // Check if the date is valid
                                if (isNaN(requestDate.getTime())) {
                                    throw new Error('Invalid date');
                                }
                                
                                const dateStr = requestDate.toLocaleDateString('en-US', {
                                    month: 'numeric',
                                    day: 'numeric',
                                    timeZone: 'America/New_York'
                                });
                                const timeStr = requestDate.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                    timeZone: 'America/New_York'
                                });
                                timeDisplay = ` <span class="request-time">(${dateStr} ${timeStr})</span>`;
                            } catch (e) {
                                // If date parsing fails, just show the raw time
                                timeDisplay = ` <span class="request-time">(${requestedAt})</span>`;
                            }
                        }
                        
                        html += `<li class="user-item">• ${userName}${timeDisplay}</li>`;
                    }
                });
                html += '</ul>';
                html += '</div>';
            }
        }
        // Handle individual users with teams (has user_name and teams)
        else if (responder.user_name) {
            const userName = responder.user_name;
            const requestedAt = responder.requested_at;
            let timeDisplay = '';
            
            if (requestedAt) {
                try {
                    // Handle both UTC format with Z and without
                    let dateString = requestedAt;
                    if (dateString && !dateString.endsWith('Z') && !dateString.includes('+')) {
                        dateString += 'Z';
                    }
                    
                    const requestDate = new Date(dateString);
                    
                    // Check if the date is valid
                    if (isNaN(requestDate.getTime())) {
                        throw new Error('Invalid date');
                    }
                    
                    const dateStr = requestDate.toLocaleDateString('en-US', {
                        month: 'numeric',
                        day: 'numeric',
                        timeZone: 'America/New_York'
                    });
                    const timeStr = requestDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'America/New_York'
                    });
                    timeDisplay = ` <span class="request-time">(${dateStr} ${timeStr})</span>`;
                } catch (e) {
                    // If date parsing fails, just show the raw time
                    timeDisplay = ` <span class="request-time">(${requestedAt})</span>`;
                }
            }
            
            html += `<div class="responder-team user-name">${userName}${timeDisplay}</div>`;
            if (responder.teams && responder.teams.length > 0) {
                html += '<div class="responder-users">';
                html += '<ul class="team-list">';
                responder.teams.forEach(teamData => {
                    // Handle both old format (string) and new format (object with team and color)
                    if (typeof teamData === 'string') {
                        // Check if this team matches any escalation policy color
                        const matchingColor = findMatchingEscalationPolicyColor(teamData, escalationPolicyColors);
                        if (matchingColor) {
                            html += `<li class="team-item" style="background-color: ${matchingColor}; border-left: 3px solid ${adjustColorBrightness(matchingColor, -20)}; padding: 4px 8px; margin: 2px 0; border-radius: 4px;">• ${teamData}</li>`;
                        } else {
                            html += `<li class="team-item no-color">• ${teamData}</li>`;
                        }
                    } else {
                        // Check if this team matches any escalation policy color (override existing color if match found)
                        const matchingColor = findMatchingEscalationPolicyColor(teamData.team, escalationPolicyColors);
                        const finalColor = matchingColor || teamData.color;
                        if (finalColor) {
                            html += `<li class="team-item" style="background-color: ${finalColor}; border-left: 3px solid ${adjustColorBrightness(finalColor, -20)}; padding: 4px 8px; margin: 2px 0; border-radius: 4px;">• ${teamData.team}</li>`;
                        } else {
                            html += `<li class="team-item no-color">• ${teamData.team}</li>`;
                        }
                    }
                });
                html += '</ul>';
                html += '</div>';
            }
        }
        
        html += '</div>';
    });
    
    if (respondersContainer) respondersContainer.innerHTML = html;
    if (mobileRespondersContainer) mobileRespondersContainer.innerHTML = html;
}

// Helper function to adjust color brightness
function adjustColorBrightness(hex, percent) {
    // Remove the hash if present
    hex = hex.replace('#', '');
    
    // Parse r, g, b values
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Adjust brightness
    const newR = Math.max(0, Math.min(255, r + (r * percent / 100)));
    const newG = Math.max(0, Math.min(255, g + (g * percent / 100)));
    const newB = Math.max(0, Math.min(255, b + (b * percent / 100)));
    
    // Convert back to hex
    const toHex = (n) => {
        const hex = Math.round(n).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    
    return '#' + toHex(newR) + toHex(newG) + toHex(newB);
}

// Disable default browser tooltips and enable custom ones with smart positioning
document.addEventListener('DOMContentLoaded', function() {
    const elementsWithTooltips = document.querySelectorAll('[title]');
    elementsWithTooltips.forEach(element => {
        // Store the title content
        const tooltipText = element.getAttribute('title');
        // Remove the title attribute to disable default tooltip
        element.removeAttribute('title');
        // Add data attribute for our custom tooltip
        element.setAttribute('data-tooltip', tooltipText);
        
        // Add positioning logic for tooltips near top of viewport
        element.addEventListener('mouseenter', function() {
            positionTooltipForViewport(this);
        });
    });
});

// Function to position tooltips based on viewport position
function positionTooltipForViewport(element) {
    // Remove any existing positioning classes
    element.classList.remove('tooltip-below', 'tooltip-right');
    
    // Get element position relative to viewport
    const elementRect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // If element is a label for ticket number or update number, position to the right (priority)
    if (element.getAttribute('for') === 'ticket_number' || element.getAttribute('for') === 'update_number') {
        element.classList.add('tooltip-right');
    }
    // If element is in the top 200px of viewport, position tooltip below
    else if (elementRect.top < 200) {
        element.classList.add('tooltip-below');
    }
    // If element is the ticket number or update number field, position below to avoid covering the input
    else if (element.id === 'ticket_number' || element.id === 'update_number') {
        element.classList.add('tooltip-below');
    }
    // If element is in the left sidebar (form area) and has room to the right, position tooltip to the right
    else if (elementRect.left < 400 && elementRect.right < viewportWidth - 300) {
        element.classList.add('tooltip-right');
    }
}

// Add event listener for ticket number input
const ticketNumberInput = document.getElementById('ticket_number');
ticketNumberInput.addEventListener('input', function(e) {
    const ticketNumber = e.target.value.trim();
    
    // Clear cached data when ticket number changes
    if (lastTicketNumber !== ticketNumber) {
        cachedIncidentData = null;
        lastTicketNumber = ticketNumber;
    }
    
    if (ticketNumber.length > 0) {
        fetchAndDisplayResponders(ticketNumber);
        
        // Hide status updates trail and show generating message when new ticket is entered
        const statusUpdatesTrail = document.getElementById('status-updates-trail');
        const statusUpdatesDivider = document.getElementById('status-updates-divider');
        const statusUpdatesList = document.getElementById('status-updates-list');
        const noStatusUpdates = document.getElementById('no-status-updates');
        const timeSinceElement = document.getElementById('time-since-last-update');
        
        if (statusUpdatesTrail) {
            statusUpdatesTrail.classList.remove('hidden');
            if (statusUpdatesDivider) {
                statusUpdatesDivider.classList.remove('hidden');
            }
            noStatusUpdates.classList.add('hidden');
            timeSinceElement.classList.add('hidden');
            statusUpdatesList.innerHTML = '<div class="text-center text-gray-500 italic py-8"><p>Loading status updates...</p></div>';
        }
        
        // Clear any existing timer
        if (statusUpdateTimer) {
            clearInterval(statusUpdateTimer);
            statusUpdateTimer = null;
        }
        
        // Auto-submit if ticket number has at least 6 characters
        if (ticketNumber.length >= 6) {
            // Small delay to allow user to finish typing
            setTimeout(() => {
                if (e.target.value.trim().length >= 6) {
                    document.getElementById('incidentForm').dispatchEvent(new Event('submit'));
                }
            }, 500);
        }
    } else {
        const placeholder = '<div class="text-center text-gray-500 italic py-8"><p>Enter a ticket number to see responders</p></div>';
        const respondersContainer = document.getElementById('responders-container');
        const mobileRespondersContainer = document.getElementById('responders-container-mobile');
        if (respondersContainer) respondersContainer.innerHTML = placeholder;
        if (mobileRespondersContainer) mobileRespondersContainer.innerHTML = placeholder;
        
        // Hide status updates trail when ticket number is cleared
        const statusUpdatesTrail = document.getElementById('status-updates-trail');
        const statusUpdatesDivider = document.getElementById('status-updates-divider');
        if (statusUpdatesTrail) {
            statusUpdatesTrail.classList.add('hidden');
        }
        if (statusUpdatesDivider) {
            statusUpdatesDivider.classList.add('hidden');
        }
        
        // Clear any existing timer
        if (statusUpdateTimer) {
            clearInterval(statusUpdateTimer);
            statusUpdateTimer = null;
        }
    }
});

// Add Enter key support for ticket number input
ticketNumberInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const ticketNumber = e.target.value.trim();
        if (ticketNumber.length > 0) {
            // Clear cached data to force fresh API call
            cachedIncidentData = null;
            lastTicketNumber = null;
            if (statusUpdateTimer) {
                clearInterval(statusUpdateTimer);
                statusUpdateTimer = null;
            }
            
            // Trigger the same functionality as auto-submit
            document.getElementById('incidentForm').dispatchEvent(new Event('submit'));
        }
    }
});

// Track the last ticket number to detect changes
let lastTicketNumber = null;

document.getElementById('incidentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        ticket_number: formData.get('ticket_number'),
        update_number: parseInt(formData.get('update_number')),
        resolve: document.getElementById('resolve').checked,
        downgrade: document.getElementById('downgrade').checked,
        show_users: true  // Always show users now
    };
    
    const resultDiv = document.getElementById('notification-message');
    const resultContainer = document.getElementById('result-container');
    const welcomeMessage = document.getElementById('welcome-message');
    
    // Determine if API call is needed
    const ticketNumberChanged = lastTicketNumber !== data.ticket_number;
    const needsApiCall = ticketNumberChanged || !cachedIncidentData;
    
    // Debug logging
    console.log('Form submission debug:', {
        ticketNumberChanged,
        needsApiCall,
        submitterText: e.submitter ? e.submitter.textContent : 'No submitter'
    });
    
    if (needsApiCall) {
        // Make API call for new ticket or when no cached data
        resultDiv.className = 'min-h-[200px] p-4 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 loading';
        resultDiv.innerHTML = '<div class="spinner"></div>Gathering incident information...';
        resultContainer.classList.remove('hidden');
        welcomeMessage.classList.add('hidden');
        
        // Clear responders section while loading
        clearResponders();
        
        
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify(data),
                cache: 'no-cache'
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Cache the incident data for instant updates
                cachedIncidentData = result.incident_data;
                lastTicketNumber = data.ticket_number;
                
                // Update incident information section
                updateIncidentInfo(result.incident_data);
                
                // Load status updates trail
                loadStatusUpdatesTrail(result.incident_data.incident.id);
                
                resultDiv.className = 'min-h-[200px] p-4 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 success editable';
                resultDiv.innerHTML = result.notification_message.replace(/\n/g, '<br>');
                resultDiv.contentEditable = true;
                resultDiv.spellcheck = false;
                
                // Add event listener to ensure proper line breaks
                addContentEditableListeners(resultDiv);
                
                // Add copy button
                addCopyButton(resultDiv, result.notification_message);
                
                
                // Display responders if available
                if (result.responders && result.responders.length > 0) {
                    displayResponders(result.responders);
                }
            } else {
                resultDiv.className = 'min-h-[200px] p-4 border border-red-300 rounded-md bg-red-50 text-red-700 error';
                resultDiv.textContent = 'Error: ' + result.detail;
                resultDiv.contentEditable = false;
            }
        } catch (error) {
            resultDiv.className = 'min-h-[200px] p-4 border border-red-300 rounded-md bg-red-50 text-red-700 error';
            resultDiv.textContent = 'Error: ' + error.message;
        }
    } else {
        // Use cached data for instant update
        resultContainer.classList.remove('hidden');
        welcomeMessage.classList.add('hidden');
        
        
        const newNotificationMessage = generateNotificationMessageLocally(
            cachedIncidentData, 
            data.ticket_number, 
            data.update_number, 
            data.resolve, 
            data.downgrade
        );
        
        if (newNotificationMessage) {
            resultDiv.className = 'min-h-[200px] p-4 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 success editable';
            resultDiv.innerHTML = newNotificationMessage.replace(/\n/g, '<br>');
            resultDiv.contentEditable = true;
            resultDiv.spellcheck = false;
            
            // Add event listener to ensure proper line breaks
            addContentEditableListeners(resultDiv);
            
            // Add copy button
            addCopyButton(resultDiv, newNotificationMessage);
            
        }
    }
});

// Add copy, Slack, and PagerDuty status update buttons function
function addCopyButton(resultDiv, text) {
    // Remove existing buttons if any
    const existingButtons = document.querySelectorAll('.copy-button, .slack-button, .add-note-button, .status-update-button, .ack-button');
    existingButtons.forEach(button => button.remove());
    
    // Get the button containers
    const primaryButtonContainer = document.getElementById('primary-button-container');
    const secondaryButtonContainer = document.getElementById('secondary-button-container');
    
    // Create copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button tooltip-below';
    copyButton.setAttribute('data-tooltip', 'Copy notification message to clipboard');
    copyButton.innerHTML = `
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
        </svg>
        Copy
    `;
    copyButton.style.cssText = `
        background: #6b7280;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s ease;
        min-width: 80px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    
    // Add hover effect for copy button
    copyButton.addEventListener('mouseenter', function() {
        this.style.background = '#4b5563';
        this.style.transform = 'translateY(-1px)';
        // Highlight the notification message area
        const notificationDiv = document.getElementById('notification-message');
        if (notificationDiv) {
            notificationDiv.style.borderColor = '#3b82f6';
            notificationDiv.style.backgroundColor = '#eff6ff';
            notificationDiv.style.transition = 'all 0.2s ease';
        }
    });
    
    copyButton.addEventListener('mouseleave', function() {
        this.style.background = '#6b7280';
        this.style.transform = 'translateY(0)';
        // Remove highlight from notification message area
        const notificationDiv = document.getElementById('notification-message');
        if (notificationDiv) {
            notificationDiv.style.borderColor = '#e5e7eb';
            notificationDiv.style.backgroundColor = '#f9fafb';
        }
    });
    
    copyButton.addEventListener('click', async function() {
        try {
            // Get the current content from the editable result div, preserving line breaks
            const currentContent = getFormattedTextContent(resultDiv);
            await navigator.clipboard.writeText(currentContent);
            copyButton.innerHTML = `
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Copied!
            `;
            copyButton.style.background = '#6b7280';
            setTimeout(() => {
                copyButton.innerHTML = `
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                    Copy
                `;
                copyButton.style.background = '#6b7280';
            }, 2000);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            const currentContent = getFormattedTextContent(resultDiv);
            textArea.value = currentContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            copyButton.textContent = '✅ Copied!';
            copyButton.style.background = '#6b7280';
            setTimeout(() => {
                copyButton.innerHTML = `
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                    Copy
                `;
                copyButton.style.background = '#6b7280';
            }, 2000);
        }
    });
    
    // Create Slack button
    const slackButton = document.createElement('button');
    slackButton.className = 'slack-button tooltip-below';
    slackButton.setAttribute('data-tooltip', 'Sends the message above to configured Slack channel');
    slackButton.innerHTML = '<img src="/static/images/Slack_Symbol_0.svg" width="45" height="45" style="margin-right: 4px; object-fit: contain; display: block;">Peer Review';
    slackButton.style.cssText = `
        background: #4A154B;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s ease;
        min-width: 140px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    
    // Add hover effect for Slack button
    slackButton.addEventListener('mouseenter', function() {
        this.style.background = '#611f69';
        this.style.transform = 'translateY(-1px)';
    });
    
    slackButton.addEventListener('mouseleave', function() {
        this.style.background = '#4A154B';
        this.style.transform = 'translateY(0)';
    });
    
    slackButton.addEventListener('click', async function() {
        try {
            slackButton.textContent = '⏳ Sending...';
            slackButton.disabled = true;
            
            // Get the current content from the editable result div, preserving line breaks
            const currentContent = getFormattedTextContent(resultDiv);
            
            const response = await fetch('/api/slack/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: currentContent })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                slackButton.innerHTML = '✅ Sent to Slack!';
                slackButton.style.background = '#28a745';
                setTimeout(() => {
                    slackButton.innerHTML = '<img src="/static/images/Slack_Symbol_0.svg" width="45" height="45" style="margin-right: 4px; object-fit: contain; display: block;">Peer Review';
                    slackButton.style.background = 'linear-gradient(135deg, #4A154B 0%, #611f69 100%)';
                    slackButton.disabled = false;
                }, 3000);
            } else {
                throw new Error(result.detail || 'Failed to Peer Review');
            }
        } catch (err) {
            slackButton.innerHTML = '❌ Failed to Send';
            slackButton.style.background = '#dc3545';
            setTimeout(() => {
                slackButton.innerHTML = '<img src="/static/images/Slack_Symbol_0.svg" width="45" height="45" style="margin-right: 4px; object-fit: contain; display: block;">Peer Review';
                slackButton.style.background = 'linear-gradient(135deg, #4A154B 0%, #611f69 100%)';
                slackButton.disabled = false;
            }, 3000);
            console.error('Slack send error:', err);
        }
    });
    
    // Create PagerDuty ack button
    const pagerdutyAckButton = document.createElement('button');
    pagerdutyAckButton.className = 'ack-button tooltip-below';
    pagerdutyAckButton.innerHTML = `
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Ack
    `;
    pagerdutyAckButton.setAttribute('data-tooltip', "Adds a note to the incident saying 'SRO US acknowledged'");
    pagerdutyAckButton.style.cssText = `
        background: #10b981;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s ease;
        min-width: 140px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    
    // Add hover effect for ack button
    pagerdutyAckButton.addEventListener('mouseenter', function() {
        this.style.background = '#059669';
        this.style.transform = 'translateY(-1px)';
    });
    
    pagerdutyAckButton.addEventListener('mouseleave', function() {
        this.style.background = '#10b981';
        this.style.transform = 'translateY(0)';
    });
    
    pagerdutyAckButton.addEventListener('click', async function() {
        try {
            pagerdutyAckButton.textContent = '⏳ Sending...';
            pagerdutyAckButton.disabled = true;
            
            // Get the current incident ID from the form
            const ticketNumber = document.getElementById('ticket_number').value;
            if (!ticketNumber) {
                throw new Error('Please enter a ticket number first');
            }
            
            // Get the incident ID from cached incident data
            if (!cachedIncidentData || !cachedIncidentData.incident || !cachedIncidentData.incident.id) {
                throw new Error('Incident data not available. Please refresh the data first.');
            }
            const incidentId = cachedIncidentData.incident.id;
            
            const response = await fetch('/api/add-note', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    incident_id: incidentId,
                    message: 'SRO US acknowledged'
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                // Refresh the status updates trail
                loadStatusUpdatesTrail(incidentId);
                
                pagerdutyAckButton.textContent = '✔️ Ack Sent!';
                pagerdutyAckButton.style.background = '#28a745';
                setTimeout(() => {
                    pagerdutyAckButton.innerHTML = `
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Ack
    `;
                    pagerdutyAckButton.style.background = 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)';
                    pagerdutyAckButton.disabled = false;
                }, 3000);
            } else {
                throw new Error(result.message || result.error || 'Failed to send ack');
            }
        } catch (err) {
            pagerdutyAckButton.textContent = '❌ Failed to Send';
            pagerdutyAckButton.style.background = '#dc3545';
            setTimeout(() => {
                pagerdutyAckButton.innerHTML = `
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Ack
    `;
                pagerdutyAckButton.style.background = 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)';
                pagerdutyAckButton.disabled = false;
            }, 3000);
            console.error('PagerDuty ack error:', err);
            alert('Failed to send ack: ' + err.message);
        }
    });
    
    // Create PagerDuty add note button
    const pagerdutyAddNoteButton = document.createElement('button');
    pagerdutyAddNoteButton.className = 'add-note-button tooltip-below';
    pagerdutyAddNoteButton.innerHTML = `
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
        </svg>
        Add Note
    `;
    pagerdutyAddNoteButton.setAttribute('data-tooltip', "Adds the notification message above as a note to the incident");
    pagerdutyAddNoteButton.style.cssText = `
        background: #6366f1;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s ease;
        min-width: 140px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    
    // Add hover effect for PagerDuty button
    pagerdutyAddNoteButton.addEventListener('mouseenter', function() {
        this.style.background = '#4f46e5';
        this.style.transform = 'translateY(-1px)';
    });
    
    pagerdutyAddNoteButton.addEventListener('mouseleave', function() {
        this.style.background = '#6366f1';
        this.style.transform = 'translateY(0)';
    });
    
    pagerdutyAddNoteButton.addEventListener('click', async function() {
        try {
            pagerdutyAddNoteButton.textContent = '⏳ Sending...';
            pagerdutyAddNoteButton.disabled = true;
            
            // Get the current incident ID from the form
            const ticketNumber = document.getElementById('ticket_number').value;
            if (!ticketNumber) {
                throw new Error('Please enter a ticket number first');
            }
            
            // Get the incident ID from cached incident data
            if (!cachedIncidentData || !cachedIncidentData.incident || !cachedIncidentData.incident.id) {
                throw new Error('Incident data not available. Please refresh the data first.');
            }
            const incidentId = cachedIncidentData.incident.id;
            
            // Determine status based on form inputs
            const resolveChecked = document.getElementById('resolve').checked;
            const downgradeChecked = document.getElementById('downgrade').checked;
            
            let status = 'investigating';
            if (resolveChecked) {
                status = 'resolved';
            } else if (downgradeChecked) {
                status = 'monitoring';
            }
            
             // Get the current content from the editable result div, preserving line breaks
             const currentContent = getFormattedTextContent(resultDiv);
             
             const response = await fetch('/api/add-note', {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                 },
                 body: JSON.stringify({ 
                     incident_id: incidentId,
                     message: currentContent 
                 })
             });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                // Refresh the status updates trail
                loadStatusUpdatesTrail(incidentId);
                
                pagerdutyAddNoteButton.textContent = '✅ Note Added!';
                pagerdutyAddNoteButton.style.background = '#28a745';
                setTimeout(() => {
                    pagerdutyAddNoteButton.innerHTML = `
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
        </svg>
        Add Note
    `;
                    pagerdutyAddNoteButton.style.background = 'linear-gradient(135deg, #06A77D 0%, #048A6F 100%)';
                    pagerdutyAddNoteButton.disabled = false;
                }, 3000);
            } else {
                throw new Error(result.message || result.error || 'Failed to add note');
            }
        } catch (err) {
            pagerdutyAddNoteButton.textContent = '❌ Failed to Send';
            pagerdutyAddNoteButton.style.background = '#dc3545';
            setTimeout(() => {
                pagerdutyAddNoteButton.innerHTML = `
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
        </svg>
        Add Note
    `;
                pagerdutyAddNoteButton.style.background = 'linear-gradient(135deg, #06A77D 0%, #048A6F 100%)';
                pagerdutyAddNoteButton.disabled = false;
            }, 3000);
            console.error('PagerDuty add note error:', err);
            alert('Failed to add note: ' + err.message);
        }
    });
    
    // Create PagerDuty send status update button
    const statusUpdateButton = document.createElement('button');
    statusUpdateButton.className = 'status-update-button tooltip-below';
    statusUpdateButton.textContent = '📢 Send Status Update';
    statusUpdateButton.setAttribute('data-tooltip', "Sends a status update of the message above, and also adds it as a note in the incident");
    statusUpdateButton.style.cssText = `
        background: #f59e0b;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s ease;
        min-width: 140px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    
    // Add hover effect for status update button
    statusUpdateButton.addEventListener('mouseenter', function() {
        this.style.background = '#d97706';
        this.style.transform = 'translateY(-1px)';
    });
    
    statusUpdateButton.addEventListener('mouseleave', function() {
        this.style.background = '#f59e0b';
        this.style.transform = 'translateY(0)';
    });
    
    statusUpdateButton.addEventListener('click', async function() {
        try {
            statusUpdateButton.textContent = '⏳ Sending...';
            statusUpdateButton.disabled = true;
            
            // Get the current incident ID from the form
            const ticketNumber = document.getElementById('ticket_number').value;
            if (!ticketNumber) {
                throw new Error('Please enter a ticket number first');
            }
            
            // Get the incident ID from cached incident data
            if (!cachedIncidentData || !cachedIncidentData.incident || !cachedIncidentData.incident.id) {
                throw new Error('Incident data not available. Please refresh the data first.');
            }
            const incidentId = cachedIncidentData.incident.id;
            
            // Determine status based on form inputs
            const resolveChecked = document.getElementById('resolve').checked;
            const downgradeChecked = document.getElementById('downgrade').checked;
            
            let status = 'investigating';
            if (resolveChecked) {
                status = 'resolved';
            } else if (downgradeChecked) {
                status = 'monitoring';
            }
            
            // Get the current content from the editable result div, preserving line breaks
            const currentContent = getFormattedTextContent(resultDiv);
            
            const response = await fetch('/api/status-update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    incident_id: incidentId,
                    status: status,
                    message: currentContent
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                // Increment the update number by 1
                const updateNumberInput = document.getElementById('update_number');
                const currentUpdateNumber = parseInt(updateNumberInput.value) || 1;
                updateNumberInput.value = currentUpdateNumber + 1;
                
                // Trigger the update notification function to refresh the result div
                updateNotificationIfLoaded();
                
                // Refresh the status updates trail
                loadStatusUpdatesTrail(incidentId);
                
                statusUpdateButton.textContent = '✅ Status Update Sent!';
                statusUpdateButton.style.background = '#28a745';
                setTimeout(() => {
                    statusUpdateButton.textContent = '📢 Send Status Update';
                    statusUpdateButton.style.background = 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)';
                    statusUpdateButton.disabled = false;
                }, 3000);
            } else {
                throw new Error(result.message || result.error || 'Failed to send status update');
            }
        } catch (err) {
            statusUpdateButton.textContent = '❌ Failed to Send';
            statusUpdateButton.style.background = '#dc3545';
            setTimeout(() => {
                statusUpdateButton.textContent = '📢 Send Status Update';
                statusUpdateButton.style.background = 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)';
                statusUpdateButton.disabled = false;
            }, 3000);
            console.error('PagerDuty send status update error:', err);
            alert('Failed to send status update: ' + err.message);
        }
    });
    
    // Add buttons to containers
    primaryButtonContainer.appendChild(copyButton);
    secondaryButtonContainer.appendChild(pagerdutyAckButton);
    secondaryButtonContainer.appendChild(pagerdutyAddNoteButton);
    secondaryButtonContainer.appendChild(slackButton);
    secondaryButtonContainer.appendChild(statusUpdateButton);
}

// Global variable to store the timer interval
let statusUpdateTimer = null;

// Function to load and display status updates trail
async function loadStatusUpdatesTrail(incidentId) {
    console.log('loadStatusUpdatesTrail called with incidentId:', incidentId);
    const statusUpdatesTrail = document.getElementById('status-updates-trail');
    const statusUpdatesDivider = document.getElementById('status-updates-divider');
    const statusUpdatesList = document.getElementById('status-updates-list');
    const noStatusUpdates = document.getElementById('no-status-updates');
    
    if (!incidentId) {
        statusUpdatesTrail.classList.add('hidden');
        if (statusUpdatesDivider) {
            statusUpdatesDivider.classList.add('hidden');
        }
        // Clear any existing timer
        if (statusUpdateTimer) {
            clearInterval(statusUpdateTimer);
            statusUpdateTimer = null;
        }
        return;
    }
    
    // Show the trail and divider
    statusUpdatesTrail.classList.remove('hidden');
    if (statusUpdatesDivider) {
        statusUpdatesDivider.classList.remove('hidden');
    }
    noStatusUpdates.classList.add('hidden');
    
    // Show loading indicator for status updates
    statusUpdatesList.innerHTML = '<div class="text-center text-gray-500 italic py-8"><div class="spinner"></div>Loading status updates...</div>';
    
    try {
        console.log('Fetching status updates from API for incident:', incidentId);
        // Add cache-busting parameter to prevent browser caching
        const cacheBuster = new Date().getTime();
        const response = await fetch(`/api/incident/${incidentId}/status-updates?t=${cacheBuster}`, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        console.log('Status updates API response status:', response.status);
        if (response.ok) {
            const data = await response.json();
            const statusUpdates = data.status_updates || [];
            console.log('Received status updates:', statusUpdates.length, 'updates');
            
            if (statusUpdates.length === 0) {
                noStatusUpdates.classList.remove('hidden');
                statusUpdatesList.innerHTML = '';
                // Hide timer when no updates
                const timeSinceElement = document.getElementById('time-since-last-update');
                if (timeSinceElement) {
                    timeSinceElement.classList.add('hidden');
                }
            } else {
                noStatusUpdates.classList.add('hidden');
                
                // Sort by creation time (most recent first)
                statusUpdates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                
                // Display status updates
                statusUpdatesList.innerHTML = statusUpdates.map(update => {
                    const createdAt = convertUtcToEastern(update.created_at);
                    const userName = update.agent ? update.agent.summary : 'Unknown User';
                    const message = update.message || 'No message';
                    
                    return `
                        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div class="flex items-start justify-between mb-2">
                                <div class="flex items-center space-x-2">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        Status Update
                                    </span>
                                    <span class="text-sm text-gray-500">by ${userName}</span>
                                </div>
                                <span class="text-sm text-gray-500">${createdAt}</span>
                            </div>
                            <div class="text-sm text-gray-700 whitespace-pre-wrap">${message}</div>
                        </div>
                    `;
                }).join('');
                
                // Check the latest status update message for "update {number}" pattern
                if (statusUpdates.length > 0) {
                    const latestUpdate = statusUpdates[0];
                    const message = latestUpdate.message || '';
                    
                    // Look for pattern "update {number}" (case insensitive)
                    const updatePattern = /update\s+(\d+)/i;
                    const match = message.match(updatePattern);
                    
                    if (match) {
                        const foundUpdateNumber = parseInt(match[1]);
                        const updateNumberInput = document.getElementById('update_number');
                        if (updateNumberInput) {
                            // Set the update number to found number + 1
                            updateNumberInput.value = foundUpdateNumber + 1;
                            
                            // Trigger the template update logic to refresh the result div
                            updateNotificationIfLoaded();
                        }
                    }
                    
                    startStatusUpdateTimer(statusUpdates[0].created_at);
                }
                
                // Show a brief success message when status updates are refreshed
                console.log('Status updates refreshed successfully');
            }
        } else {
            throw new Error(`Failed to fetch status updates: ${response.status}`);
        }
    } catch (error) {
        console.error('Error loading status updates:', error);
        noStatusUpdates.classList.remove('hidden');
        noStatusUpdates.innerHTML = '<p>Error loading status updates</p>';
    }
}

// Function to start the status update timer
function startStatusUpdateTimer(lastUpdateTime) {
    // Clear any existing timer
    if (statusUpdateTimer) {
        clearInterval(statusUpdateTimer);
    }
    
    const timeSinceElement = document.getElementById('time-since-last-update');
    const timeSinceText = document.getElementById('time-since-text');
    
    if (!timeSinceElement || !timeSinceText) {
        return;
    }
    
    // Show the timer element
    timeSinceElement.classList.remove('hidden');
    
    // Function to update the timer display
    function updateTimer() {
        const now = new Date();
        const lastUpdate = new Date(lastUpdateTime);
        const diffMs = now - lastUpdate;
        
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        let timeString;
        if (diffDays > 0) {
            timeString = `Time since last update: ${diffDays}d ${diffHours % 24}h`;
        } else if (diffHours > 0) {
            timeString = `Time since last update: ${diffHours}h ${diffMinutes % 60}m`;
        } else if (diffMinutes > 0) {
            timeString = `Time since last update: ${diffMinutes}m ${diffSeconds % 60}s`;
        } else {
            timeString = `Time since last update: ${diffSeconds}s`;
        }
        
        timeSinceText.textContent = timeString;
    }
    
    // Update immediately and then every second
    updateTimer();
    statusUpdateTimer = setInterval(updateTimer, 1000);
}

// Function to reset all fields and return to original state
function resetToOriginalState() {
    // Clear form fields
    document.getElementById('ticket_number').value = '';
    document.getElementById('update_number').value = '1';
    document.getElementById('resolve').checked = false;
    document.getElementById('downgrade').checked = false;
    
    // Clear cached data
    cachedIncidentData = null;
    lastTicketNumber = null;
    
    // Hide incident info section
    const incidentInfoSection = document.getElementById('incident-info-section');
    if (incidentInfoSection) {
        incidentInfoSection.classList.add('hidden');
    }
    
    // Hide status updates trail
    const statusUpdatesTrail = document.getElementById('status-updates-trail');
    const statusUpdatesDivider = document.getElementById('status-updates-divider');
    if (statusUpdatesTrail) {
        statusUpdatesTrail.classList.add('hidden');
    }
    if (statusUpdatesDivider) {
        statusUpdatesDivider.classList.add('hidden');
    }
    
    // Clear status update timer
    if (statusUpdateTimer) {
        clearInterval(statusUpdateTimer);
        statusUpdateTimer = null;
    }
    
        // Hide result container and show welcome message
        const resultContainer = document.getElementById('result-container');
        const welcomeMessage = document.getElementById('welcome-message');
        const resultDiv = document.getElementById('notification-message');
        resultContainer.classList.add('hidden');
        welcomeMessage.classList.remove('hidden');
    resultDiv.textContent = '';
    resultDiv.className = '';
    resultDiv.contentEditable = false;
    
    // Clear responders
    const placeholder = '<div class="text-center text-gray-500 italic py-8"><p>Enter a ticket number to see responders</p></div>';
    const respondersContainer = document.getElementById('responders-container');
    const mobileRespondersContainer = document.getElementById('responders-container-mobile');
    if (respondersContainer) respondersContainer.innerHTML = placeholder;
    if (mobileRespondersContainer) mobileRespondersContainer.innerHTML = placeholder;
    
    // Remove buttons if they exist
    const existingButtons = document.querySelectorAll('.copy-button, .slack-button, .add-note-button, .status-update-button, .ack-button');
    existingButtons.forEach(button => button.remove());
    
}

// Function to update notification if one is already loaded (instant, no API calls)
function updateNotificationIfLoaded() {
    const resultContainer = document.getElementById('result-container');
    const resultDiv = document.getElementById('notification-message');
    
    // Only update if there's already a result displayed and we have cached data
    if (!resultContainer.classList.contains('hidden') && resultDiv.innerHTML.trim() !== '' && cachedIncidentData) {
        const ticketNumber = document.getElementById('ticket_number').value.trim();
        if (!ticketNumber) return;
        
        const updateNumber = parseInt(document.getElementById('update_number').value) || 1;
        const resolve = document.getElementById('resolve').checked;
        const downgrade = document.getElementById('downgrade').checked;
        
        // Generate notification message locally (instant)
        const newNotificationMessage = generateNotificationMessageLocally(
            cachedIncidentData, 
            ticketNumber, 
            updateNumber, 
            resolve, 
            downgrade
        );
        
        if (newNotificationMessage) {
            resultDiv.innerHTML = newNotificationMessage.replace(/\n/g, '<br>');
            
            // Update buttons with new text
            addCopyButton(resultDiv, newNotificationMessage);
        }
    }
}

// Add some nice animations and auto-focus
document.addEventListener('DOMContentLoaded', function() {
    // Load notification template first
    loadNotificationTemplate();
    
    
    const container = document.querySelector('body');
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        container.style.transition = 'all 0.6s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
        
        // Auto-focus on ticket number field
        const ticketNumberField = document.getElementById('ticket_number');
        if (ticketNumberField) {
            ticketNumberField.focus();
        }
        
        // Make checkbox items clickable
        const checkboxItems = document.querySelectorAll('.checkbox-item');
        checkboxItems.forEach(item => {
            item.addEventListener('click', function(e) {
                // Don't trigger if clicking directly on the checkbox or label
                if (e.target.type === 'checkbox' || e.target.tagName === 'LABEL') {
                    return;
                }
                
                // Find the checkbox within this item and toggle it
                const checkbox = this.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    // Trigger change event to ensure form validation works
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        });
        
        // Add real-time update for checkboxes and update number
        const resolveCheckbox = document.getElementById('resolve');
        const downgradeCheckbox = document.getElementById('downgrade');
        const updateNumberInput = document.getElementById('update_number');
        const resetButton = document.getElementById('resetBtn');
        const searchButton = document.getElementById('searchBtn');
        
        if (resolveCheckbox) {
            resolveCheckbox.addEventListener('change', updateNotificationIfLoaded);
        }
        if (downgradeCheckbox) {
            downgradeCheckbox.addEventListener('change', updateNotificationIfLoaded);
        }
        if (updateNumberInput) {
            updateNumberInput.addEventListener('input', updateNotificationIfLoaded);
        }
        if (resetButton) {
            resetButton.addEventListener('click', resetToOriginalState);
        }
        if (searchButton) {
            searchButton.addEventListener('click', function() {
                const ticketNumber = document.getElementById('ticket_number').value.trim();
                if (ticketNumber.length > 0) {
                    // Add loading state to search button
                    const originalHTML = searchButton.innerHTML;
                    searchButton.innerHTML = '⏳';
                    searchButton.disabled = true;
                    
                    // Clear cached data to force fresh API call
                    cachedIncidentData = null;
                    lastTicketNumber = null;
                    if (statusUpdateTimer) {
                        clearInterval(statusUpdateTimer);
                        statusUpdateTimer = null;
                    }
                    
                    // Trigger the same functionality as auto-submit
                    document.getElementById('incidentForm').dispatchEvent(new Event('submit'));
                    
                    // Restore button state after a short delay (the form submission will handle the actual loading)
                    setTimeout(() => {
                        searchButton.innerHTML = originalHTML;
                        searchButton.disabled = false;
                    }, 1000);
                }
            });
        }
    }, 100);
});
