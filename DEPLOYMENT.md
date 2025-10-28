# HHHomes ERP - Production Deployment Guide

This guide covers setting up and maintaining a production deployment with zero-downtime capabilities.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Zero-Downtime Deployment](#zero-downtime-deployment)
3. [Backup and Restore](#backup-and-restore)
4. [Monitoring and Alerts](#monitoring-and-alerts)
5. [Troubleshooting](#troubleshooting)
6. [Disaster Recovery](#disaster-recovery)

## Initial Setup

### Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose installed
- Domain name with DNS configured
- Minimum 4GB RAM, 2 CPU cores, 20GB disk space

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd construction-erp
```

### Step 2: Run Initial Setup

```bash
chmod +x setup.sh
./setup.sh
```

This script will:
- Generate secure random passwords
- Create environment files
- Configure SSL certificates
- Start all services
- Run database migrations

### Step 3: Verify Deployment

```bash
# Check all services are running
docker-compose ps

# Check logs
docker-compose logs -f

# Test endpoints
curl https://api.yourdomain.com/health
curl https://app.yourdomain.com
```

## Zero-Downtime Deployment

The system uses blue-green deployment for zero-downtime updates.

### Architecture

- **Blue Environment**: Currently serving traffic
- **Green Environment**: Standby for deployments
- **Nginx**: Routes traffic between blue and green

### Deployment Process

```bash
chmod +x deploy-zero-downtime.sh
./deploy-zero-downtime.sh
```

The script automatically:
1. Detects active environment (blue or green)
2. Pulls latest code
3. Builds new Docker images
4. Starts inactive environment
5. Waits for health checks
6. Runs database migrations
7. Switches traffic to new environment
8. Stops old environment

### Rollback

If issues are detected after deployment:

```bash
# Rollback by starting the old environment
docker-compose -f docker-compose.prod.yml up -d api-<old-color> web-<old-color>

# Reload nginx to switch traffic back
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

# Stop the problematic environment
docker-compose -f docker-compose.prod.yml stop api-<new-color> web-<new-color>
```

## Backup and Restore

### Automated Backups

Backups run automatically every day at 2 AM. Configuration in `docker-compose.prod.yml`:

```yaml
backup:
  environment:
    BACKUP_SCHEDULE: "0 2 * * *"  # Daily at 2 AM
```

Backups are stored in `./backups` directory with 7-day retention.

### Manual Backup

```bash
docker-compose -f docker-compose.prod.yml exec backup /backup.sh
```

### Restore from Backup

```bash
# Make restore script executable
chmod +x scripts/restore.sh

# Run in backup container
docker-compose -f docker-compose.prod.yml exec backup /restore.sh
```

The script will:
1. List available backups
2. Let you select which to restore
3. Verify backup integrity
4. Stop API services
5. Restore database
6. Restart services

### Cloud Backup (Optional)

To enable cloud backups, edit `scripts/backup.sh` and uncomment the S3 section:

```bash
# Uncomment and configure
if [ ! -z "${AWS_S3_BUCKET}" ]; then
    print_info "Uploading to S3..."
    aws s3 cp ${BACKUP_FILE} s3://${AWS_S3_BUCKET}/backups/
    print_success "Uploaded to S3"
fi
```

Add to environment:
```bash
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

## Monitoring and Alerts

### Access Monitoring Tools

- **Grafana**: https://yourdomain.com:3030 (default password in `.env`)
- **Prometheus**: https://yourdomain.com:9090

### Key Metrics to Monitor

1. **API Health**
   - Response times (95th percentile < 2s)
   - Error rates (< 5%)
   - Request throughput

2. **Database**
   - Connection count (< 80% of max)
   - Query performance
   - Replication lag (if configured)

3. **System Resources**
   - CPU usage (< 80%)
   - Memory usage (< 90%)
   - Disk space (> 10% free)

4. **Docker Containers**
   - Container health status
   - Restart count
   - Resource usage

### Alert Configuration

Alerts are defined in `monitoring/alerts/`:
- `api-alerts.yml` - API service alerts
- `database-alerts.yml` - Database and Redis alerts
- `infrastructure-alerts.yml` - System and container alerts

### Setting Up Notifications

To receive alert notifications:

1. Configure Alertmanager (optional):

```yaml
# alertmanager.yml
route:
  receiver: 'email'
receivers:
  - name: 'email'
    email_configs:
      - to: 'your-email@example.com'
        from: 'alerts@yourdomain.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'your-email@gmail.com'
        auth_password: 'your-app-password'
```

2. Update `prometheus.yml` to enable alerting:

```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

## Troubleshooting

### Services Won't Start

```bash
# Check Docker logs
docker-compose -f docker-compose.prod.yml logs <service-name>

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Restart specific service
docker-compose -f docker-compose.prod.yml restart <service-name>
```

### Database Connection Issues

```bash
# Check database is running
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U erpuser

# Check connections
docker-compose -f docker-compose.prod.yml exec postgres psql -U erpuser -d erp_production -c "SELECT count(*) FROM pg_stat_activity;"

# View active queries
docker-compose -f docker-compose.prod.yml exec postgres psql -U erpuser -d erp_production -c "SELECT pid, query, state FROM pg_stat_activity WHERE state != 'idle';"
```

### High Memory Usage

```bash
# Check container memory usage
docker stats

# Restart high-memory containers
docker-compose -f docker-compose.prod.yml restart api-blue

# Check for memory leaks in logs
docker-compose -f docker-compose.prod.yml logs api-blue | grep -i "memory\|heap"
```

### SSL Certificate Issues

```bash
# Renew certificates manually
docker-compose -f docker-compose.prod.yml run --rm certbot renew

# Check certificate expiration
docker-compose -f docker-compose.prod.yml exec nginx openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -noout -dates
```

### Deployment Failed

```bash
# Check health of inactive environment
docker inspect --format='{{.State.Health.Status}}' hhhomes-api-green

# View detailed health check logs
docker inspect hhhomes-api-green | grep -A 20 "Health"

# Manually test health endpoint
curl http://localhost:3001/health
```

## Disaster Recovery

### Complete System Failure

If the entire system fails, follow these steps:

1. **Assess the situation**
   ```bash
   # Check what's running
   docker ps -a

   # Check system resources
   df -h
   free -m
   top
   ```

2. **Stop everything**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

3. **Check for corruption**
   ```bash
   # Check Docker volumes
   docker volume ls

   # Inspect volume data
   docker run --rm -v hhhomes_postgres_data:/data alpine ls -la /data
   ```

4. **Restore from backup**
   ```bash
   # Use the restore script
   chmod +x scripts/restore.sh
   docker-compose -f docker-compose.prod.yml up -d postgres
   docker-compose -f docker-compose.prod.yml exec backup /restore.sh
   ```

5. **Restart services**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Database Corruption

```bash
# Stop all API services
docker-compose -f docker-compose.prod.yml stop api-blue api-green

# Restore from latest backup
docker-compose -f docker-compose.prod.yml exec backup /restore.sh

# Restart API services
docker-compose -f docker-compose.prod.yml start api-blue
```

### Complete Reset

If you need to start completely fresh:

```bash
chmod +x reset-and-deploy.sh
./reset-and-deploy.sh
```

This will:
- Stop all containers
- Remove all volumes
- Delete environment files
- Clean Docker system
- Prepare for fresh setup

Then run `./setup.sh` to redeploy.

## Maintenance Tasks

### Weekly Tasks

- [ ] Review monitoring dashboards for trends
- [ ] Check backup integrity
- [ ] Review error logs
- [ ] Check disk space usage

### Monthly Tasks

- [ ] Update Docker images
- [ ] Review and optimize database queries
- [ ] Review SSL certificate expiration
- [ ] Test disaster recovery process
- [ ] Update dependencies

### Quarterly Tasks

- [ ] Full system audit
- [ ] Performance testing
- [ ] Security review
- [ ] Capacity planning review

## Security Best Practices

1. **Keep secrets secure**
   - Never commit `.env` files
   - Rotate secrets regularly
   - Use strong passwords (handled by setup script)

2. **Regular updates**
   - Update base Docker images monthly
   - Apply security patches promptly
   - Keep dependencies up to date

3. **Access control**
   - Use SSH keys, not passwords
   - Implement firewall rules
   - Restrict database access to Docker network

4. **Monitoring**
   - Set up alerts for suspicious activity
   - Review logs regularly
   - Monitor failed login attempts

5. **Backups**
   - Test restore procedures regularly
   - Keep backups in multiple locations
   - Encrypt sensitive backups

## Performance Optimization

### Database Optimization

```sql
-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan;

-- Vacuum and analyze
VACUUM ANALYZE;
```

### Nginx Optimization

The production nginx configuration already includes:
- Gzip compression
- Connection keepalive
- Rate limiting
- Caching headers

### Docker Optimization

```bash
# Clean up unused images
docker system prune -a

# Remove unused volumes
docker volume prune

# Check image sizes
docker images --format "{{.Repository}}:{{.Tag}}\t{{.Size}}"
```

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Review this documentation
3. Check monitoring dashboards
4. Contact system administrator

## Version History

- **1.0.0** - Initial production setup with zero-downtime deployment
