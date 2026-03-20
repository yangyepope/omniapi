# If you come from bash you might have to change your $PATH.
export PATH="$HOME/bin:$HOME/.local/bin:/usr/local/bin:$PATH"
export UV_CONFIG_DIR="${UV_CONFIG_DIR:-$HOME/.local/uv}"

# Path to your Oh My Zsh installation.
export ZSH="$HOME/.oh-my-zsh"

# Set name of the theme to load --- if set to "random", it will
# load a random theme each time Oh My Zsh is loaded, in which case,
# to know which specific one was loaded, run: echo $RANDOM_THEME
# See https://github.com/ohmyzsh/ohmyzsh/wiki/Themes
ZSH_THEME="agnoster"

# Set list of themes to pick from when loading at random
# Setting this variable when ZSH_THEME=random will cause zsh to load
# a theme from this variable instead of looking in $ZSH/themes/
# If set to an empty array, this variable will have no effect.
# ZSH_THEME_RANDOM_CANDIDATES=( "robbyrussell" "agnoster" )

# Uncomment the following line to use case-sensitive completion.
# CASE_SENSITIVE="true"

# Uncomment the following line to use hyphen-insensitive completion.
# Case-sensitive completion must be off. _ and - will be interchangeable.
# HYPHEN_INSENSITIVE="true"

# Uncomment one of the following lines to change the auto-update behavior
# zstyle ':omz:update' mode disabled  # disable automatic updates
# zstyle ':omz:update' mode auto      # update automatically without asking
# zstyle ':omz:update' mode reminder  # just remind me to update when it's time

# Uncomment the following line to change how often to auto-update (in days).
# zstyle ':omz:update' frequency 13

# Uncomment the following line if pasting URLs and other text is messed up.
# DISABLE_MAGIC_FUNCTIONS="true"

# Uncomment the following line to disable colors in ls.
# DISABLE_LS_COLORS="true"

# Uncomment the following line to disable auto-setting terminal title.
# DISABLE_AUTO_TITLE="true"

# Uncomment the following line to enable command auto-correction.
# ENABLE_CORRECTION="true"

# Uncomment the following line to display red dots whilst waiting for completion.
# You can also set it to another string to have that shown instead of the default red dots.
# e.g. COMPLETION_WAITING_DOTS="%F{yellow}waiting...%f"
# Caution: this setting can cause issues with multiline prompts in zsh < 5.7.1 (see #5765)
# COMPLETION_WAITING_DOTS="true"

# Uncomment the following line if you want to disable marking untracked files
# under VCS as dirty. This makes repository status check for large repositories
# much, much faster.
# DISABLE_UNTRACKED_FILES_DIRTY="true"

# Uncomment the following line if you want to change the command execution time
# stamp shown in the history command output.
# You can set one of the optional three formats:
# "mm/dd/yyyy"|"dd.mm.yyyy"|"yyyy-mm-dd"
# or set a custom format using the strftime function format specifications,
# see 'man strftime' for details.
# HIST_STAMPS="mm/dd/yyyy"

# Would you like to use another custom folder than $ZSH/custom?
# ZSH_CUSTOM=/path/to/new-custom-folder

# Which plugins would you like to load?
# Standard plugins can be found in $ZSH/plugins/
# Custom plugins may be added to $ZSH_CUSTOM/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.
plugins=(git)

source $ZSH/oh-my-zsh.sh

# User configuration

# export MANPATH="/usr/local/man:$MANPATH"

# You may need to manually set your language environment
# export LANG=en_US.UTF-8

# Preferred editor for local and remote sessions
# if [[ -n $SSH_CONNECTION ]]; then
#   export EDITOR='vim'
# else
#   export EDITOR='nvim'
# fi

# Compilation flags
# export ARCHFLAGS="-arch $(uname -m)"

# Set personal aliases, overriding those provided by Oh My Zsh libs,
# plugins, and themes. Aliases can be placed here, though Oh My Zsh
# users are encouraged to define aliases within a top-level file in
# the $ZSH_CUSTOM folder, with .zsh extension. Examples:
# - $ZSH_CUSTOM/aliases.zsh
# - $ZSH_CUSTOM/macos.zsh
# For a full list of active aliases, run `alias`.
#
# Example aliases
# alias zshconfig="mate ~/.zshrc"
# alias ohmyzsh="mate ~/.oh-my-zsh"


# 定义 dcup 函数，$1 代表第一个参数（即你的变量 prestart）
dcup() {
  docker compose up -d "$@"
}

# 维护一份“短命令 -> 原始命令”的映射，便于自查
typeset -gA DOCKER_SHORT_CMD_MAP
DOCKER_SHORT_CMD_MAP[dcup]='docker compose up -d [services...]'

# 定义 dcdown 函数：停止并移除 compose 容器/网络（保留卷）
dcdown() {
  docker compose down "$@"
}
DOCKER_SHORT_CMD_MAP[dcdown]='docker compose down [options]'

# 定义 dcps 函数：查看 compose 服务状态
dcps() {
  docker compose ps "$@"
}
DOCKER_SHORT_CMD_MAP[dcps]='docker compose ps [services...]'

# 定义 dclogs 函数：跟随查看 compose 日志（默认 tail 200 行）
dclogs() {
  docker compose logs -f --tail=200 "$@"
}
DOCKER_SHORT_CMD_MAP[dclogs]='docker compose logs -f --tail=200 [services...]'

# 定义 dcrestart 函数：重启 compose 服务
dcrestart() {
  docker compose restart "$@"
}
DOCKER_SHORT_CMD_MAP[dcrestart]='docker compose restart [services...]'

# 定义 dcstop 函数：停止 compose 服务（不移除）
dcstop() {
  docker compose stop "$@"
}
DOCKER_SHORT_CMD_MAP[dcstop]='docker compose stop [services...]'

# 定义 dcstart 函数：启动 compose 服务（不重建）
dcstart() {
  docker compose start "$@"
}
DOCKER_SHORT_CMD_MAP[dcstart]='docker compose start [services...]'

# 定义 dcb 函数：构建 compose 镜像
dcb() {
  docker compose build "$@"
}
DOCKER_SHORT_CMD_MAP[dcb]='docker compose build [services...]'

# 定义 dcpull 函数：拉取 compose 镜像
dcpull() {
  docker compose pull "$@"
}
DOCKER_SHORT_CMD_MAP[dcpull]='docker compose pull [services...]'

# 定义 dcexec 函数：进入 compose 容器执行命令（用法：dcexec <service> <cmd...>）
dcexec() {
  docker compose exec "$@"
}
DOCKER_SHORT_CMD_MAP[dcexec]='docker compose exec <service> <cmd...>'

# 定义 dcrun 函数：以一次性任务运行 compose 服务（用法：dcrun <service> <cmd...>）
dcrun() {
  docker compose run --rm "$@"
}
DOCKER_SHORT_CMD_MAP[dcrun]='docker compose run --rm <service> <cmd...>'

# 定义 dcls 函数：列出当前机器上的 compose 项目
dcls() {
  docker compose ls "$@"
}
DOCKER_SHORT_CMD_MAP[dcls]='docker compose ls'

# 定义 dcconfig 函数：渲染最终 compose 配置（便于排查环境变量/覆盖）
dcconfig() {
  docker compose config "$@"
}
DOCKER_SHORT_CMD_MAP[dcconfig]='docker compose config'

# 定义 dps 函数：查看所有 docker 容器（包含已退出）
dps() {
  docker ps -a "$@"
}
DOCKER_SHORT_CMD_MAP[dps]='docker ps -a'

# 定义 dexec 函数：进入任意容器执行命令（用法：dexec <container> <cmd...>）
dexec() {
  docker exec -it "$@"
}
DOCKER_SHORT_CMD_MAP[dexec]='docker exec -it <container> <cmd...>'

# 定义 dlogs 函数：跟随查看任意容器日志（默认 tail 200 行，用法：dlogs <container>）
dlogs() {
  docker logs -f --tail=200 "$@"
}
DOCKER_SHORT_CMD_MAP[dlogs]='docker logs -f --tail=200 <container>'

# 自定义命令：查看短命令映射与当前终端最近一条命令（用法：dcmap 或 dcmap <short>）
dcmap() {
  local key="$1"
  if [[ -n "$key" ]]; then
    if [[ -n "${DOCKER_SHORT_CMD_MAP[$key]}" ]]; then
      print -r -- "${key} => ${DOCKER_SHORT_CMD_MAP[$key]}"
    else
      print -r -- "${key} => (未登记)"
    fi
    print -r -- "last => $(fc -ln -1)"
    return 0
  fi

  print -r -- "Short Commands:"
  local k
  for k in ${(ok)DOCKER_SHORT_CMD_MAP}; do
    print -r -- "  ${k} => ${DOCKER_SHORT_CMD_MAP[$k]}"
  done
  print -r -- "last => $(fc -ln -1)"
}
