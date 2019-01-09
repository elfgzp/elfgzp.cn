FROM ruby:latest
RUN gem sources --add https://gems.ruby-china.com/ --remove https://rubygems.org/
RUN gem install jekyll bundler
RUN mkdir -p /blog/
WORKDIR /blog/
COPY Gemfile .
COPY Gemfile.lock .
RUN bundle config mirror.https://rubygems.org https://gems.ruby-china.com
RUN bundler install
COPY . .
CMD export JEKYLL_ENV=production && bundle exec jekyll serve --host 0.0.0.0