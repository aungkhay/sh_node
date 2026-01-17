# NGINX

### Protect CC Attack { This blocks CC before Node }
``` nginx
http {
    ##
    ## existing configs
    ##

    # Add this line
    limit_req_zone $binary_remote_addr zone=cc_limit:20m rate=5r/s;
    limit_conn_zone $binary_remote_addr zone=conn_limit:20m;

    map $http_user_agent $block_bot {
        default 0;
        "~*curl|wget|python|go-http-client" 1;
    }

    include mime.types;
}

server {
    listen 80;
    server_name sh-proxy.com;

    # Add this
    if ($block_bot) {
        return 444;
    }

    location / {
        # Add this line
        limit_req zone=cc_limit burst=10 nodelay;
        limit_conn conn_limit 20;
        
        proxy_pass http://127.0.0.1:2580;

        proxy_http_version 1.1;
        proxy_set_header Connection "";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```