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
	constructor (_id = 0, platform = '', login = '', password = '', tags = '', created_date = new Date())
	{
		this._id = _id;
		this.platform = platform;
		this.login = login;
		this.password = password;
		this.tags = tags;
		this.created_date = new Date(created_date).toUTCString();
	}
}

function parseAccount(account)
{
	return new Account(
		account._id,
		account.platform,
		account.login,
		account.password,
		account.tags,
		account.created_date,
	);
}

function getEncryptedAccount (account, token)
{
	let encryptedAccount = JSON.parse(JSON.stringify(account)); // Clone object without reference

	if (account.platform)
	{
		encryptedAccount['platform'] = encrypt(account.platform, token);;
	}

	if (account.login)
	{
		encryptedAccount['login'] = encrypt(account.login, token);
	}

	if (account.password)
	{
		encryptedAccount['password'] = encrypt(account.password, token);
	}

	if (account.tags)
	{
		encryptedAccount['tags'] = encrypt(account.tags, token);            
	}

	return encryptedAccount;
}

function getDecryptedAccount (account, token)
{
	let decryptedAccount = JSON.parse(JSON.stringify(account)); // Clone object without reference

	if (account.platform)
	{
		decryptedAccount['platform'] = decrypt(account.platform, token);
	}

	if (account.login)
	{
		decryptedAccount['login'] = decrypt(account.login, token);
	}

	if (account.password)
	{
		decryptedAccount['password'] = decrypt(account.password, token);
	}

	if (account.tags)
	{
		decryptedAccount['tags'] = decrypt(account.tags, token);            
	}

	if (account.created_date)
	{
		let created_date = decryptedAccount['created_date'];
		decryptedAccount['created_date'] = new Date(created_date).toUTCString();            
	}

	return decryptedAccount;
}

function cleanUrl (url)
{
	url = extractHostname(url);

	return url;
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

function getAuthorizationString(email, token)
{
	var authorizationBasic = btoa(email + ":" + token).toString("base64");

	return 'Basic ' + authorizationBasic;
}

function getHeaders()
{
	let headers = new Headers();

	headers.append('Content-Type', 'application/json');

	return headers;
}

function getHeadersWithAuth(email, token)
{
	let headers = getHeaders();

	headers.append('Authorization', getAuthorizationString(email, token));

	return headers;
}

function attachRevealFunction() {
	$('.reveal-btn').click(function() {
	
		const contentId = $(this).data('content-id');
		
		$('#'+contentId).css('display', 'block');
		$(this).css('display', 'none');
		
		$('.hide-btn[data-content-id="'+contentId+'"]').css('display', 'block');
	})
	
	$('.hide-btn').click(function() {
	
		const contentId = $(this).data('content-id');

		$('#'+contentId).css('display', 'none');
		$(this).css('display', 'none');
			
		$('.reveal-btn[data-content-id="'+contentId+'"]').css('display', 'block');
	})
}

function fetchCredentials ()
{
	const credentials = JSON.parse(
				window.localStorage.getItem('user')
			);
	
	return credentials
			? credentials
			: {
				email: '',
				token: ''
			}
}

function login(email, password)
{
	let credentials =
        {
            email: email,
            password: password
        };
		
	return fetch('https://jisme-api.herokuapp.com/users/login/',
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
	return accounts.filter(a => url.toLowerCase().includes(cleanUrl(a.platform).toLowerCase()));
}

function displayAccounts(accounts)
{
	const accountsHtml = accounts.map(a => 
			`	<div class="card">
  <header class="card-header">
    <p class="card-header-title">
      ${ a.login }
    </p>
    <a href="#" class="card-header-icon" aria-label="Reveal">
	  <span class="icon reveal-btn" data-content-id="${a._id}">
		<i class="far fa-eye"></i>
	  </span>
	  <span class="icon hide-btn" data-content-id="${a._id}">
		<i class="far fa-eye-slash"></i>
	  </span>
    </a>
  </header>
  <div class="card-content" id="${a._id}">
    <div class="content">
      ${ a.password }
    </div>
  </div>
</div>`
		);
			
	$('#app').html(accountsHtml);
		
	attachRevealFunction();
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

function fetchAccountsOnline(url, email, token)
{
	return fetch('https://jisme-api.herokuapp.com/accounts/',
	{
		method: 'GET',
		headers: getHeadersWithAuth(email, token)
	})
	.then(response => response.clone().json())
	.then(accounts => {
		localStorage.setItem('accounts', JSON.stringify(accounts.map(account => parseAccount(getDecryptedAccount(account, token))), url))
		localStorage.setItem('last_fetch_date', JSON.stringify(new Date()))
		location.reload()
	});
}

function fetchAccountsForUrl(url, email, token)
{
	const storedAccounts = JSON.parse(localStorage.getItem('accounts'))
	
	const userLastUpdateDate = new Date(JSON.parse(localStorage.getItem('user')).last_update_date)
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
		fetchAccountsOnline(url, email, token)
	}
}

$(document).ready(function() {
	chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
		let activeTabUrl = tabs[0].url;

		const { email, token } = fetchCredentials();
		if (email && token) {
			fetchAccountsForUrl(activeTabUrl, email, token);
		}
		else {
			$('#login').css('display', 'block');
			
			$('#login-btn').click(function() {
				login($('#email-input').val(), $('#password-input').val());
			})
		}
	});
});