// PagerDuty Notification Generator JavaScript

// Global variable to store incident data for instant updates
let cachedIncidentData = null;

// Global variable to store notification template
let notificationTemplate = null;

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
                    "team_engaged": "The {team_name} team has engaged to investigate the incident.",
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
        
        // Clean up title for the SRO message - remove everything before second pipe
        let alertTitle = title;
        const pipeCount = (title.match(/\|/g) || []).length;
        if (pipeCount >= 2) {
            const firstPipe = title.indexOf('|');
            const secondPipe = title.indexOf('|', firstPipe + 1);
            if (secondPipe !== -1) {
                alertTitle = title.substring(secondPipe + 1).trim();
            }
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
        const placeholder = '<div class="responders-placeholder"><p>Enter a ticket number to see responders</p></div>';
        if (respondersContainer) respondersContainer.innerHTML = placeholder;
        if (mobileRespondersContainer) mobileRespondersContainer.innerHTML = placeholder;
        return;
    }
    
    try {
        const response = await fetch(`/api/incident/${ticketNumber}`);
        if (response.ok) {
            const incidentData = await response.json();
            const respondersResponse = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ticket_number: ticketNumber,
                    update_number: 1,
                    resolve: false,
                    downgrade: false,
                    show_users: true
                })
            });
            
            if (respondersResponse.ok) {
                const result = await respondersResponse.json();
                if (result.responders && result.responders.length > 0) {
                    displayResponders(result.responders);
                } else {
                    const noRespondersMsg = '<div class="responders-placeholder"><p>No responders found for this incident</p></div>';
                    if (respondersContainer) respondersContainer.innerHTML = noRespondersMsg;
                    if (mobileRespondersContainer) mobileRespondersContainer.innerHTML = noRespondersMsg;
                }
            } else {
                const errorMsg = '<div class="responders-placeholder"><p>Error loading responders</p></div>';
                if (respondersContainer) respondersContainer.innerHTML = errorMsg;
                if (mobileRespondersContainer) mobileRespondersContainer.innerHTML = errorMsg;
            }
        } else {
            const notFoundMsg = '<div class="responders-placeholder"><p>Incident not found</p></div>';
            if (respondersContainer) respondersContainer.innerHTML = notFoundMsg;
            if (mobileRespondersContainer) mobileRespondersContainer.innerHTML = notFoundMsg;
        }
    } catch (error) {
        const errorMsg = '<div class="responders-placeholder"><p>Error loading responders</p></div>';
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

// Function to display responders
function displayResponders(responders) {
    const respondersContainer = document.getElementById('responders-container');
    const mobileRespondersContainer = document.getElementById('responders-container-mobile');
    let html = '';
    
    // Extract escalation policy colors for matching
    const escalationPolicyColors = extractEscalationPolicyColors(responders);
    
    responders.forEach(responder => {
        html += '<div class="responder-item">';
        
        // Handle escalation policy responders (has team_name and users)
        if (responder.team_name) {
            const color = responder.color || '#f5f5f5';
            html += `<div class="responder-team escalation-policy" style="background-color: ${color}; border-left: 4px solid ${adjustColorBrightness(color, -20)};">${responder.team_name}</div>`;
            if (responder.users && responder.users.length > 0) {
                html += '<div class="responder-users">';
                html += '<ul>';
                responder.users.forEach(user => {
                    // Handle both old format (string) and new format (object with name and requested_at)
                    if (typeof user === 'string') {
                        html += `<li>${user}</li>`;
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
                                
                                const timeStr = requestDate.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                    timeZone: 'America/New_York'
                                });
                                timeDisplay = ` <span class="request-time">(${timeStr})</span>`;
                            } catch (e) {
                                // If date parsing fails, just show the raw time
                                timeDisplay = ` <span class="request-time">(${requestedAt})</span>`;
                            }
                        }
                        
                        html += `<li>${userName}${timeDisplay}</li>`;
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
                    
                    const timeStr = requestDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'America/New_York'
                    });
                    timeDisplay = ` <span class="request-time">(${timeStr})</span>`;
                } catch (e) {
                    // If date parsing fails, just show the raw time
                    timeDisplay = ` <span class="request-time">(${requestedAt})</span>`;
                }
            }
            
            html += `<div class="responder-team user-name">${userName}${timeDisplay}</div>`;
            if (responder.teams && responder.teams.length > 0) {
                html += '<div class="responder-users">';
                html += '<ul>';
                responder.teams.forEach(teamData => {
                    // Handle both old format (string) and new format (object with team and color)
                    if (typeof teamData === 'string') {
                        // Check if this team matches any escalation policy color
                        const matchingColor = findMatchingEscalationPolicyColor(teamData, escalationPolicyColors);
                        if (matchingColor) {
                            html += `<li class="team-item" style="background-color: ${matchingColor}; border-left: 3px solid ${adjustColorBrightness(matchingColor, -20)}; padding: 4px 8px; margin: 2px 0; border-radius: 4px;">${teamData}</li>`;
                        } else {
                            html += `<li class="team-item no-color">${teamData}</li>`;
                        }
                    } else {
                        // Check if this team matches any escalation policy color (override existing color if match found)
                        const matchingColor = findMatchingEscalationPolicyColor(teamData.team, escalationPolicyColors);
                        const finalColor = matchingColor || teamData.color;
                        if (finalColor) {
                            html += `<li class="team-item" style="background-color: ${finalColor}; border-left: 3px solid ${adjustColorBrightness(finalColor, -20)}; padding: 4px 8px; margin: 2px 0; border-radius: 4px;">${teamData.team}</li>`;
                        } else {
                            html += `<li class="team-item no-color">${teamData.team}</li>`;
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
        
        // Add smart positioning logic
        element.addEventListener('mouseenter', function() {
            positionTooltip(this);
        });
    });
});

// Function to position tooltips to prevent overflow
function positionTooltip(element) {
    // Remove any existing positioning classes
    element.classList.remove('tooltip-left', 'tooltip-right', 'tooltip-top');
    
    // Create a temporary tooltip element to measure its dimensions
    const tempTooltip = document.createElement('div');
    tempTooltip.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: nowrap;
        background: #1f2937;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 0.875rem;
        z-index: 1000;
        max-width: 300px;
        word-wrap: break-word;
        white-space: normal;
    `;
    tempTooltip.textContent = element.getAttribute('data-tooltip');
    document.body.appendChild(tempTooltip);
    
    // Get dimensions
    const tooltipRect = tempTooltip.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Clean up temporary element
    document.body.removeChild(tempTooltip);
    
    // Calculate available space
    const spaceLeft = elementRect.left;
    const spaceRight = viewportWidth - elementRect.right;
    const spaceTop = elementRect.top;
    const spaceBottom = viewportHeight - elementRect.bottom;
    
    const tooltipWidth = tooltipRect.width;
    const tooltipHeight = tooltipRect.height;
    
    // Determine best position
    if (spaceBottom < tooltipHeight + 20 && spaceTop > tooltipHeight + 20) {
        // Position above if there's more space above
        element.classList.add('tooltip-top');
    } else if (spaceLeft < tooltipWidth / 2 && spaceRight > tooltipWidth / 2) {
        // Position to the right if there's more space on the right
        element.classList.add('tooltip-right');
    } else if (spaceRight < tooltipWidth / 2 && spaceLeft > tooltipWidth / 2) {
        // Position to the left if there's more space on the left
        element.classList.add('tooltip-left');
    }
    // If there's enough space in all directions, use default centered positioning
}

// Recalculate tooltip positions on window resize
window.addEventListener('resize', function() {
    const elementsWithTooltips = document.querySelectorAll('[data-tooltip]');
    elementsWithTooltips.forEach(element => {
        // Remove positioning classes on resize
        element.classList.remove('tooltip-left', 'tooltip-right', 'tooltip-top');
    });
});

// Add event listener for ticket number input
document.getElementById('ticket_number').addEventListener('input', function(e) {
    const ticketNumber = e.target.value.trim();
    
    // Clear cached data when ticket number changes
    if (lastTicketNumber !== ticketNumber) {
        cachedIncidentData = null;
        lastTicketNumber = ticketNumber;
    }
    
    if (ticketNumber.length > 0) {
        fetchAndDisplayResponders(ticketNumber);
        
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
        const placeholder = '<div class="responders-placeholder"><p>Enter a ticket number to see responders</p></div>';
        const respondersContainer = document.getElementById('responders-container');
        const mobileRespondersContainer = document.getElementById('responders-container-mobile');
        if (respondersContainer) respondersContainer.innerHTML = placeholder;
        if (mobileRespondersContainer) mobileRespondersContainer.innerHTML = placeholder;
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
    
    const resultDiv = document.getElementById('result');
    const resultContainer = document.getElementById('result-container');
    const welcomeMessage = document.getElementById('welcome-message');
    
    // Always make API call when refresh button is pressed to get fresh data
    const isRefreshButton = e.submitter && e.submitter.textContent === 'Refresh Data';
    const ticketNumberChanged = lastTicketNumber !== data.ticket_number;
    const needsApiCall = isRefreshButton || ticketNumberChanged || !cachedIncidentData;
    
    if (needsApiCall) {
        // Make API call for new ticket, when no cached data, or when refresh button is pressed
        resultDiv.className = 'min-h-[200px] p-4 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 loading';
        resultDiv.innerHTML = isRefreshButton ? 
            '<div class="spinner"></div>Refreshing incident data...' : 
            '<div class="spinner"></div>Generating notification...';
        resultContainer.classList.remove('hidden');
        welcomeMessage.classList.add('hidden');
        
        
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Cache the incident data for instant updates
                cachedIncidentData = result.incident_data;
                lastTicketNumber = data.ticket_number;
                
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
    const existingButtons = document.querySelectorAll('.copy-button, .slack-button, .add-note-button, .status-update-button');
    existingButtons.forEach(button => button.remove());
    
    // Get the button containers
    const primaryButtonContainer = document.getElementById('primary-button-container');
    const secondaryButtonContainer = document.getElementById('secondary-button-container');
    
    // Create copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.textContent = '📋 Copy to Clipboard';
    copyButton.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 600;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        min-width: 140px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Add hover effect for copy button
    copyButton.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
    });
    
    copyButton.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
    });
    
    copyButton.addEventListener('click', async function() {
        try {
            // Get the current content from the editable result div, preserving line breaks
            const currentContent = getFormattedTextContent(resultDiv);
            await navigator.clipboard.writeText(currentContent);
            copyButton.textContent = '✅ Copied!';
            copyButton.style.background = '#28a745';
            setTimeout(() => {
                copyButton.textContent = '📋 Copy to Clipboard';
                copyButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
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
            copyButton.style.background = '#28a745';
            setTimeout(() => {
                copyButton.textContent = '📋 Copy to Clipboard';
                copyButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            }, 2000);
        }
    });
    
    // Create Slack button
    const slackButton = document.createElement('button');
    slackButton.className = 'slack-button';
    slackButton.innerHTML = '<img src="/static/images/Slack_Symbol_0.svg" width="45" height="45" style="margin-right: 3px;">Peer Review';
    slackButton.style.cssText = `
        background: linear-gradient(135deg, #4A154B 0%, #611f69 100%);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 600;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(74, 21, 75, 0.3);
        min-width: 140px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Add hover effect for Slack button
    slackButton.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 6px 20px rgba(74, 21, 75, 0.4)';
    });
    
    slackButton.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 15px rgba(74, 21, 75, 0.3)';
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
                    slackButton.innerHTML = '<img src="/static/images/Slack_Symbol_0.svg" width="45" height="45" style="margin-right: 3px;"> Send to Slack';
                    slackButton.style.background = 'linear-gradient(135deg, #4A154B 0%, #611f69 100%)';
                    slackButton.disabled = false;
                }, 3000);
            } else {
                throw new Error(result.detail || 'Failed to send to Slack');
            }
        } catch (err) {
            slackButton.innerHTML = '❌ Failed to Send';
            slackButton.style.background = '#dc3545';
            setTimeout(() => {
                slackButton.innerHTML = '<img src="/static/images/Slack_Symbol_0.svg" width="50" height="50"> Send to Slack';
                slackButton.style.background = 'linear-gradient(135deg, #4A154B 0%, #611f69 100%)';
                slackButton.disabled = false;
            }, 3000);
            console.error('Slack send error:', err);
        }
    });
    
    // Create PagerDuty add note button
    const pagerdutyAddNoteButton = document.createElement('button');
    pagerdutyAddNoteButton.className = 'add-note-button';
    pagerdutyAddNoteButton.textContent = '📝 Add Note';
    pagerdutyAddNoteButton.style.cssText = `
        background: linear-gradient(135deg, #06A77D 0%, #048A6F 100%);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 600;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(6, 167, 125, 0.3);
        min-width: 140px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Add hover effect for PagerDuty button
    pagerdutyAddNoteButton.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 6px 20px rgba(6, 167, 125, 0.4)';
    });
    
    pagerdutyAddNoteButton.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 15px rgba(6, 167, 125, 0.3)';
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
                pagerdutyAddNoteButton.textContent = '✅ Note Added!';
                pagerdutyAddNoteButton.style.background = '#28a745';
                setTimeout(() => {
                    pagerdutyAddNoteButton.textContent = '📝 Add Note';
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
                pagerdutyAddNoteButton.textContent = '📝 Add Note';
                pagerdutyAddNoteButton.style.background = 'linear-gradient(135deg, #06A77D 0%, #048A6F 100%)';
                pagerdutyAddNoteButton.disabled = false;
            }, 3000);
            console.error('PagerDuty add note error:', err);
            alert('Failed to add note: ' + err.message);
        }
    });
    
    // Create PagerDuty send status update button
    const statusUpdateButton = document.createElement('button');
    statusUpdateButton.className = 'status-update-button';
    statusUpdateButton.textContent = '📢 Send Status Update';
    statusUpdateButton.style.cssText = `
        background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 600;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
        min-width: 140px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Add hover effect for status update button
    statusUpdateButton.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.4)';
    });
    
    statusUpdateButton.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.3)';
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
    secondaryButtonContainer.appendChild(slackButton);
    secondaryButtonContainer.appendChild(pagerdutyAddNoteButton);
    secondaryButtonContainer.appendChild(statusUpdateButton);
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
    
        // Hide result container and show welcome message
        const resultContainer = document.getElementById('result-container');
        const welcomeMessage = document.getElementById('welcome-message');
        const resultDiv = document.getElementById('result');
        resultContainer.classList.add('hidden');
        welcomeMessage.classList.remove('hidden');
    resultDiv.textContent = '';
    resultDiv.className = '';
    resultDiv.contentEditable = false;
    
    // Clear responders
    const placeholder = '<div class="responders-placeholder"><p>Enter a ticket number to see responders</p></div>';
    const respondersContainer = document.getElementById('responders-container');
    const mobileRespondersContainer = document.getElementById('responders-container-mobile');
    if (respondersContainer) respondersContainer.innerHTML = placeholder;
    if (mobileRespondersContainer) mobileRespondersContainer.innerHTML = placeholder;
    
    // Remove buttons if they exist
    const existingButtons = document.querySelectorAll('.copy-button, .slack-button, .add-note-button, .status-update-button');
    existingButtons.forEach(button => button.remove());
    
}

// Function to update notification if one is already loaded (instant, no API calls)
function updateNotificationIfLoaded() {
    const resultContainer = document.getElementById('result-container');
    const resultDiv = document.getElementById('result');
    
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
    }, 100);
});
