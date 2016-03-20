NAME = dinamo
NODE_MODULES_DIR = node_modules
PORT = 5000
PORT_SSL = 5001

#ifdef USE_DOCKER
	DOCKER_NPM = docker run -it --rm \
		-v "$(CURDIR)":/usr/src/app \
		-w /usr/src/app \
		iegik/docker-node

	DOCKER_APP = docker run -it --rm \
		-p $(PORT):5000 \
		-p $(PORT_SSL):5001 \
		-v "$(CURDIR)":/usr/src/app \
		-v "$$HOME/.ssh":/root/.ssh \
		-w /usr/src/app \
		--name $(NAME) \
		iegik/docker-node

	DOCKER_RUN = docker exec -it \
		$(NAME) \

	SH = sh -c "trap exit TERM;"
#endif

help:
	@echo "USAGE\n\n" \
		"dep		- Install dependencies.\n" \
		"build	  - Build project.\n" \
		"clean	  - Clean project.\n" \

.PHONY: dep build clean\:$(NAME) clean\:$(NODE_MODULES_DIR) clean

$(NODE_MODULES_DIR): package.json
	@$(DOCKER_NPM) \
		$(SH)"npm install --unsafe-perm"

dep: $(NODE_MODULES_DIR)

build: dep
	@$(DOCKER_APP) \
		$(SH)"npm start $(ARGS)"

run\:%:
	@$(DOCKER_RUN) \
		$(SH)"$(subst run:,,$@) $(ARGS)"

clean\:$(NAME):
	@docker rm -f $(NAME)

clean\:$(NODE_MODULES_DIR):
	@$(DOCKER_NPM) \
		$(SH)"rm -rf $(NODE_MODULES_DIR)

clean: clean\:$(NAME) clean\:$(NODE_MODULES_DIR)
