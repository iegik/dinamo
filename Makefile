NAME = dinamo
NODE_MODULES_DIR = node_modules
PORT = 5000
PORT_SSL = 5001

#ifdef USE_DOCKER
    DOCKER_NPM = docker run -it --rm \
        -p $(PORT):5000 \
        -p $(PORT_SSL):5001 \
        -v "$(CURDIR)":/usr/src/app \
        -v "$$HOME/.ssh":/root/.ssh \
        -w /usr/src/app \
        --name $(NAME) \
        iegik/docker-node
    SH = sh -c "trap exit TERM;"
#endif

help:
	@echo "USAGE\n\n" \
		"dep        - Install dependencies.\n" \
		"build      - Build project.\n" \
		"clean      - Clean project.\n" \

.PHONY: dep build clean

$(NODE_MODULES_DIR): package.json
	@$(DOCKER_NPM) \
		$(SH)"npm install --unsafe-perm"

dep: $(NODE_MODULES_DIR)

build: dep
	@$(DOCKER_NPM) \
		$(SH)"npm start $(ARGS)"

run\:%:
	@$(DOCKER_NPM) \
		$(SH)"$(subst run:,,$@) $(ARGS)"

clean:
	@docker rm -f $(NAME) && $(DOCKER_NPM) \
		$(SH)"rm -rf $(NODE_MODULES_DIR) brackets*"
