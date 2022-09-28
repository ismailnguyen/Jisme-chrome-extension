function encrypt(decrypted, token)
{
	let masterpass = sha256(token)
	return sjcl.encrypt(masterpass, decrypted)
}

function decrypt(encrypted, token)
{
	let masterpass = sha256(token)
	return sjcl.decrypt(masterpass, encrypted)
}

class Account
{
	constructor (_id = 0, 
					platform = '', 
					login = '', 
					password = '', 
					password_clue = '', 
					tags = '', 
					created_date = new Date(), 
					social_login = '', 
					notes = ''
				)
    {
        this._id = _id;
        this.platform = platform;
        this.login = login;
        this.password = password;
		this.password_clue = password_clue;
        this.tags = tags;
        this.created_date = new Date(created_date).toUTCString();
		this.social_login = social_login;
		this.notes = notes;
    }
}

function parseAccount(account)
{
	return new Account(
        account._id,
        account.platform,
        account.login,
        account.password,
        account.password_clue,
        account.tags,
        account.created_date,
		account.social_login,
		account.notes
    );
}

const cryptedArgs = [
	'platform',
	'login',
	'password',
	'password_clue',
	'tags',
	'social_login',
	'notes'
];

function getEncryptedAccount (account, token)
{
	let encryptedAccount = JSON.parse(JSON.stringify(account)); // Clone object without reference
	
	cryptedArgs
	.filter(cryptedArg => account[cryptedArg])
	.forEach(cryptedArg => encryptedAccount[cryptedArg] = encrypt(account[cryptedArg], token))

    return encryptedAccount;
}

function getDecryptedAccount (account, token)
{
	let decryptedAccount = JSON.parse(JSON.stringify(account)); // Clone object without reference

	cryptedArgs
	.filter(cryptedArg => account[cryptedArg])
	.forEach(cryptedArg => decryptedAccount[cryptedArg] = decrypt(account[cryptedArg], token))

    return decryptedAccount;
}

function cleanUrl (url)
{
	return extractHostname(url);
}

function extractHostname (url)
{
	let hostname;
	
    //find & remove protocol (http, ftp, etc.) and get hostname
	if (url.indexOf("://") > -1)
	{
        hostname = url.split('/')[2];
    }
	else
	{
        hostname = url.split('/')[0];
    }

    //find & remove port number
	hostname = hostname.split(':')[0];
	
    //find & remove "?"
	hostname = hostname.split('?')[0];
	
	hostname = hostname.replace(/^www\./, '');

	if (hostname.indexOf('.') > 0)
	{
		hostname = hostname.substring(0, hostname.lastIndexOf('.'));
	}

    return hostname;
}

function getHeaders()
{
	let headers = new Headers();

	headers.append('Content-Type', 'application/json');

	return headers;
}

function getHeadersWithAuth(token)
{
	let headers = getHeaders();

    headers.append('Authorization', `Bearer ${token}`);


	return headers;
}

function fill(login, password, password_clue) {
	chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
		var activeTab = tabs[0];
		chrome.tabs.sendMessage(activeTab.id, { type: 'credentials', login: login, password: password, password_clue: password_clue });
	});
}

function attachActionButtons() {
	$('.clipboardable').click(function() {
		$(this).select();
		document.execCommand('copy');
	})
	
	$('.autofill').click(function() {
		const id = $(this).attr('id').split('login-')[1];
		
		const passwordField = $('#password-'+id+' .plain-password');
		const passwordClueField = $('#password-'+id+' .password-clue')
		
		fill($(this).val(), passwordField ? passwordField.val() : '', passwordClueField ? passwordClueField.val() : '')
	})
	 
	$('a.card-header-icon').click(function() {
		const contentId = $(this).data('content-id');
		
		const isVisible = $('#'+contentId).is(':visible');
		
		$('#'+contentId)[isVisible ? 'hide' : 'show']();
		
		$('.hide-btn[data-content-id="'+contentId+'"]')[isVisible ? 'hide' : 'show']();
		$('.reveal-btn[data-content-id="'+contentId+'"]')[isVisible ? 'show' : 'hide']();
	})
}

function fetchUser ()
{
	return JSON.parse(window.localStorage.getItem('user'))
}

function login(email, password)
{
	let credentials =
        {
            email: email,
            password: password
        };
		
	return fetch('https://api.jisme.app/users/login/',
        {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(credentials)
        })
		.then(response =>
		{
			let clonedResponse = response.clone();
			if (!clonedResponse.ok)
			{
				if (clonedResponse.status === 404)
				{
					alert('Invalid username/password !');
				}
				else
				{
					alert(clonedResponse.statusText);
				}
			}

			return clonedResponse;
		})
        .then(response => response.clone().json())
        .then(user => 
        {
            localStorage.setItem('user', JSON.stringify(user));
			
			location.reload();
        });
}


function filterAccountsByUrl(accounts, url)
{
	return accounts.filter(a => cleanUrl(url).toLowerCase().includes(cleanUrl(a.platform).toLowerCase()));
}

function displayAccounts(accounts)
{
	let accountsHtml = accounts.map(a => {
			let htmlContent = `	
<div class="card">
  <header class="card-header">
    <div class="card-header-title">
		<div class="field">
			<p class="help is-link">${cleanUrl(a.platform)}</p>
			<div class="control">
				<input class="input content-input clipboardable autofill" type="text" value="${ a.login }" id="login-${a._id}" readonly>
			</div>	
		</div>
	</div>

    <a href="#" class="card-header-icon" aria-label="Reveal" data-content-id="password-${a._id}">
	  <span class="icon reveal-btn" data-content-id="password-${a._id}">
		<i class="far fa-eye"></i>
	  </span>
	  <span class="icon hide-btn" data-content-id="password-${a._id}">
		<i class="far fa-eye-slash"></i>
	  </span> 
    </a>
  </header>
  <div class="card-content has-background-light" id="password-${a._id}">
    <div class="content">`;
					
		if (a.password) {
			htmlContent += `
				
				<label class="label">Password</label>
				<input class="input clipboardable plain-password" type="text" value="${ a.password }" readonly>
			`;
		}
		
		if (a.password_clue) {
			htmlContent += `
				<label class="label">Password clue</label>
				</span>
				<input class="input password-clue" type="text" value="${ a.password_clue }" readonly>
			`;
		}
		
		if (a.social_login) {
			htmlContent += `
				<label class="label">Social login</label>
				<input class="input" type="text" value="${ a.social_login }" readonly>
			`;
		}

		htmlContent += `</div>
	  </div>
	</div>`

	return htmlContent;
	});
			
	$('#app').html(accountsHtml);
		
	attachActionButtons();
}

function displayNotFound()
{
	$('#app').html(`
	<br>
		No account found for this website<br><br>
		<a href="https://jisme.app" target="_blank">Register your account</a>
	<br><br>
	`);
}

function fetchAccountsOnline(url, token)
{
	return fetch('https://api.jisme.app/accounts/',
	{
		method: 'GET',
		headers: getHeadersWithAuth(token)
	})
	.then(response => response.clone().json())
	.then(accounts => {
		localStorage.setItem('accounts', JSON.stringify(accounts.map(account => parseAccount(getDecryptedAccount(account, token))), url))
		localStorage.setItem('last_fetch_date', JSON.stringify(new Date()))
		location.reload()
	});
}

function updateLastUpdateDate(user)
{
	return fetch(`https://api.jisme.app/users/${user.id}`,
	{
		method: 'GET',
		headers: getHeadersWithAuth(user.token)
	})
	.then(response => response.json())
	.then(jsonData => {			
		user['last_update_date'] = jsonData.last_update_date
		
		localStorage.setItem('user', JSON.stringify(user))
	})
}

function fetchAccountsForUrl(url, user)
{
	const storedAccounts = JSON.parse(localStorage.getItem('accounts'))
	
	const userLastUpdateDate = new Date(user.last_update_date)
	
	const lastFetchDate = new Date(JSON.parse(localStorage.getItem('last_fetch_date')))
	const isUpToDate = userLastUpdateDate < lastFetchDate

	if (storedAccounts && isUpToDate) {
		
		const filteredAccounts = filterAccountsByUrl(storedAccounts, url);
		
		if (filteredAccounts.length) {
			displayAccounts(filteredAccounts);
		}
		else {
			displayNotFound();
		}
	}
	else {
		fetchAccountsOnline(url, user.token)
	}
}

$(document).ready(function() {	
	chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
		let activeTabUrl = tabs[0].url;

		const user = fetchUser();
		if (user) {
			updateLastUpdateDate(user);
			fetchAccountsForUrl(activeTabUrl, user);
		}
		else {
			$('#login').show();
			
			$('#login-btn').click(function() {
				login($('#email-input').val(), $('#password-input').val());
			})
		}
		
		chrome.tabs.executeScript(tabs[0].id, { file: "jquery-3.1.1.min.js" }, function(){});
	});
});