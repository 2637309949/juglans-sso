	Remind:
		This plugin has been merged to bulrush-identify

## juglans-sso
	Lightweight sso for Internal security network

## The certification process

- 1. user request api from web front end of app1

- 2. muti ms server use juglans-sso as plugin to detection of token is valid or not

- 3. if token is valid then loading user info from binding table

```sh
---------------------------------------
Type           |  uint   
OpenID         |  string 
UnionID        |  string 
UserID         |  uint  
---------------------------------------
```

- 4. if token invalid then redirect（redirect from The front end with callback url to app ms server） to sso server

- 5. sso server detect if valid token existed in sso domain, if not then user should login or registered

- 6. if sso domain token is valid, then redirect back to `callback url` in ms server with token, then ms server set token to app1 domain

- 7. if sso domain token is invalid, user shoud login in or registered, after authentication process has been finished, sso server set token to sso server domain and redirect back to `callback url` 


As ms server can use juglans-sso as plugin to get token info, such as userid,OpenID,UnionID in sso server, and establish a bind table from self account to sso account

As ms server can use juglans-sso as plugin to check token if valid or not


## Diff from other sso app design principle

- sso server and ms server has self account, and they can build relationships by binding table

- ms server can use self account to establish and relationships with self other tables, that should use rpc to get from sso server if you use other sso application

- ms server can detect token if valid or not by use the same strategy from sso server, that should use rpc to check from sso server if you use other sso application

## Internal security is the premise if you use this plugins

