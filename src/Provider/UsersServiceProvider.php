<?php

namespace Bolt\Provider;

use Bolt\Users;
use Silex\Application;
use Silex\ServiceProviderInterface;
use Symfony\Component\HttpFoundation\Request;

class UsersServiceProvider implements ServiceProviderInterface
{
    public function register(Application $app)
    {
        $app['users'] = $app->share(
            function ($app) {
                $repo = $app['storage']->getRepository('Bolt\Storage\Entity\Users');
                $users = new Users($app, $repo);

                return $users;
            }
        );
    }

    public function boot(Application $app)
    {
        $app->before(function (Request $request, Application $app) {
            $app['request.client_ip'] = $request->getClientIp();
        });
    }
}
