# This is REST API to retrieve image playlist between defined radius


## How to install

```
npm install
```

## Sample Request 

### Get All Images

```
curl -X GET \
  http://localhost:4443/images \
  -H 'cache-control: no-cache' \
  -H 'postman-token: 1db3d8c5-6aa6-71de-ceff-d5d6abf07834'
```

### Get Playlist by Radius

```
curl -X POST \
  http://localhost:4443/playlist \
  -H 'cache-control: no-cache' \
  -H 'content-type: application/json' \
  -H 'postman-token: 522baebd-af9b-7011-a923-95380a07725c' \
  -d '{
	"latitude":"-6.196533722670306",
	"longitude":"106.83248519548215"
}'
```
